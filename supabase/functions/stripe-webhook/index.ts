import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
};

// Tier token allowances - synced with PLAN_CONFIG in constants.ts
const TIER_TOKEN_ALLOWANCE: Record<string, number> = {
  free: 10,
  base: 50,
  premium: 150,
};

serve(async (req) => {
  // Stripe webhooks only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("ERROR: Signature verification failed", { message });
      return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Use any for supabase to avoid type issues with edge functions
    const supabase: any = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(stripe, supabase, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(stripe, supabase, subscription, event.type);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(supabase, invoice);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: any,
  session: Stripe.Checkout.Session
) {
  logStep("Processing checkout.session.completed", { sessionId: session.id });

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    logStep("Missing customer or subscription ID in session");
    return;
  }

  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    logStep("Customer was deleted");
    return;
  }

  const email = customer.email;
  if (!email) {
    logStep("Customer has no email");
    return;
  }

  // Find user by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    logStep("No profile found for email", { email });
    return;
  }

  // Store customer ID in user_subscriptions
  await supabase
    .from("user_subscriptions")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq("user_id", profile.id);

  logStep("Updated user with Stripe IDs", { userId: profile.id, customerId, subscriptionId });
}

async function handleSubscriptionChange(
  stripe: Stripe,
  supabase: any,
  subscription: Stripe.Subscription,
  eventType: string
) {
  logStep(`Processing ${eventType}`, { subscriptionId: subscription.id, status: subscription.status });

  const customerId = subscription.customer as string;

  // Get tier from product metadata or fallback to product ID mapping
  const productId = subscription.items.data[0]?.price?.product as string;
  let tier = "free";

  if (productId) {
    // Try to get tier from product metadata first (Phase 5)
    try {
      const product = await stripe.products.retrieve(productId);
      if (product.metadata?.tier) {
        tier = product.metadata.tier;
        logStep("Got tier from product metadata", { productId, tier });
      } else {
        // Fallback to hardcoded mapping (will be removed after Phase 5 migration)
        const PRODUCT_TO_TIER: Record<string, string> = {
          "prod_TlJvqeWsdZfxrF": "base",
          "prod_TlJwAJYME8i1He": "premium",
        };
        tier = PRODUCT_TO_TIER[productId] || "free";
        logStep("Using fallback tier mapping", { productId, tier });
      }
    } catch {
      logStep("Failed to retrieve product, using fallback", { productId });
    }
  }

  // Only process active subscriptions
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    logStep("Subscription not active, skipping tier update", { status: subscription.status });
    return;
  }

  // Find user by stripe_customer_id first, then by email
  let userId: string | null = null;

  const { data: subByCustomer } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (subByCustomer) {
    userId = subByCustomer.user_id;
    logStep("Found user by stripe_customer_id", { userId, customerId });
  } else {
    // Fallback to email lookup
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", customer.email)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
        logStep("Found user by email lookup", { userId, email: customer.email });
      }
    }
  }

  if (!userId) {
    logStep("No user found for customer", { customerId });
    return;
  }

  // Get current subscription state
  const { data: currentSub } = await supabase
    .from("user_subscriptions")
    .select("subscription_tier, tokens_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const previousTier = currentSub?.subscription_tier || "free";
  const newAllowance = TIER_TOKEN_ALLOWANCE[tier] || 10;

  // Update subscription - Stripe is now authoritative, so set manual_override = false
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({
      subscription_tier: tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      manual_override: false, // Stripe is authoritative
      monthly_token_allowance: newAllowance,
      // Only reset tokens if tier changed
      ...(previousTier !== tier ? {
        tokens_balance: newAllowance,
        tokens_used_this_period: 0,
        billing_cycle_start: new Date().toISOString(),
      } : {}),
    })
    .eq("user_id", userId);

  if (updateError) {
    logStep("ERROR updating subscription", { error: updateError });
    return;
  }

  // Log tier change transaction if tier changed
  if (previousTier !== tier) {
    const tokenDiff = newAllowance - (currentSub?.tokens_balance || 0);
    await supabase.from("token_transactions").insert({
      user_id: userId,
      transaction_type: "tier_change",
      tokens_amount: tokenDiff,
      tokens_balance_after: newAllowance,
      description: `Plan changed from ${previousTier} to ${tier} (via Stripe)`,
      metadata: {
        old_tier: previousTier,
        new_tier: tier,
        source: "stripe_webhook",
        event_type: eventType,
        subscription_id: subscription.id,
      },
    });

    logStep("Tier changed", { previousTier, newTier: tier, tokenDiff });
  }

  // Log to audit_logs
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "subscription_updated",
    resource_type: "subscription",
    resource_id: subscription.id,
    status: "success",
    details: {
      event_type: eventType,
      previous_tier: previousTier,
      new_tier: tier,
      subscription_status: subscription.status,
    },
  });

  logStep("Subscription update complete", { userId, tier });
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;

  // Find user by stripe_customer_id
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id, subscription_tier, tokens_balance")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!sub) {
    logStep("No subscription found for customer", { customerId });
    return;
  }

  const previousTier = sub.subscription_tier;

  // Downgrade to free but preserve tokens
  await supabase
    .from("user_subscriptions")
    .update({
      subscription_tier: "free",
      stripe_subscription_id: null,
      manual_override: false,
      monthly_token_allowance: TIER_TOKEN_ALLOWANCE.free,
      // Don't reset tokens - let users keep what they have
    })
    .eq("user_id", sub.user_id);

  // Log the change
  await supabase.from("token_transactions").insert({
    user_id: sub.user_id,
    transaction_type: "tier_change",
    tokens_amount: 0,
    tokens_balance_after: sub.tokens_balance,
    description: `Plan cancelled (${previousTier} to free)`,
    metadata: {
      old_tier: previousTier,
      new_tier: "free",
      source: "stripe_webhook",
      event_type: "subscription_deleted",
    },
  });

  logStep("Subscription cancelled, downgraded to free", { userId: sub.user_id });
}

async function handleInvoicePaid(
  supabase: any,
  invoice: Stripe.Invoice
) {
  logStep("Processing invoice.paid", { invoiceId: invoice.id });

  const customerId = invoice.customer as string;

  // Find user
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!sub) {
    logStep("No subscription found for customer", { customerId });
    return;
  }

  // Reset billing cycle on invoice paid (new billing period)
  if (invoice.billing_reason === "subscription_cycle") {
    const { data: currentSub } = await supabase
      .from("user_subscriptions")
      .select("monthly_token_allowance")
      .eq("user_id", sub.user_id)
      .single();

    const allowance = currentSub?.monthly_token_allowance || TIER_TOKEN_ALLOWANCE.free;

    await supabase
      .from("user_subscriptions")
      .update({
        billing_cycle_start: new Date().toISOString(),
        tokens_balance: allowance,
        tokens_used_this_period: 0,
      })
      .eq("user_id", sub.user_id);

    // Log token reset
    await supabase.from("token_transactions").insert({
      user_id: sub.user_id,
      transaction_type: "billing_reset",
      tokens_amount: allowance,
      tokens_balance_after: allowance,
      description: "Monthly token reset",
      metadata: {
        invoice_id: invoice.id,
        billing_reason: invoice.billing_reason,
      },
    });

    logStep("Billing cycle reset, tokens refreshed", { userId: sub.user_id, tokens: allowance });
  }
}

async function handleInvoiceFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  logStep("Processing invoice.payment_failed", { invoiceId: invoice.id });

  const customerId = invoice.customer as string;

  // Find user
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!sub) return;

  // Log the failure
  await supabase.from("audit_logs").insert({
    user_id: sub.user_id,
    action: "payment_failed",
    resource_type: "invoice",
    resource_id: invoice.id,
    status: "failed",
    details: {
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  logStep("Payment failure logged", { userId: sub.user_id, invoiceId: invoice.id });
}
