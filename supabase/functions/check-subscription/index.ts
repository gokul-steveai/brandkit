import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
};

// Stripe Product IDs mapped to tiers (PRODUCTION - Live)
const PRODUCT_TO_TIER: Record<string, string> = {
  'prod_Tn76wiubcIo6K9': 'base',
  'prod_Tn768X9tAAxGJs': 'premium',
};

// Token allowances per tier
const TIER_TOKEN_ALLOWANCE: Record<string, number> = {
  'free': 10,
  'base': 50,
  'premium': 150,
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch existing subscription first to check for manual_override
    const { data: existingSub } = await supabaseClient
      .from('user_subscriptions')
      .select('subscription_tier, tokens_balance, manual_override, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    // If no Stripe customer and manual_override is true, respect the database tier
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");

      // Check if this is a manually managed subscription
      if (existingSub?.manual_override === true) {
        logStep("Manual override active - preserving database tier", {
          currentTier: existingSub.subscription_tier
        });
        return new Response(JSON.stringify({
          subscribed: existingSub.subscription_tier !== 'free',
          tier: existingSub.subscription_tier,
          subscription_end: null,
          manual_override: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // No manual override, return free tier
      return new Response(JSON.stringify({
        subscribed: false,
        tier: 'free',
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Helper function to safely create ISO date strings
    const safeISODate = (timestamp: number | undefined | null): string | null => {
      if (!timestamp) return null;
      try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch {
        return null;
      }
    };

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let tier = 'free';
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = safeISODate(subscription.current_period_end);

      // Get product ID to determine tier
      const productId = subscription.items.data[0].price.product as string;
      tier = PRODUCT_TO_TIER[productId] || 'base';
      logStep("Active subscription found", { subscriptionId: subscription.id, tier, productId, subscriptionEnd });
    } else {
      logStep("No active Stripe subscription found");

      // If no active Stripe subscription but manual_override is true, respect the database tier
      if (existingSub?.manual_override === true) {
        logStep("Manual override active - preserving database tier", {
          currentTier: existingSub.subscription_tier
        });

        // Update Stripe customer ID but keep the tier
        await supabaseClient
          .from('user_subscriptions')
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return new Response(JSON.stringify({
          subscribed: existingSub.subscription_tier !== 'free',
          tier: existingSub.subscription_tier,
          subscription_end: null,
          manual_override: true,
          stripe_customer_id: customerId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const previousTier = existingSub?.subscription_tier || 'free';
    const shouldUpdateTokens = tier !== previousTier;

    const updateData: Record<string, unknown> = {
      subscription_tier: tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    };

    // If upgrading via Stripe, disable manual_override
    if (stripeSubscriptionId) {
      updateData.manual_override = false;
    }

    // If upgrading, adjust token allowance
    if (shouldUpdateTokens && tier !== 'free') {
      updateData.monthly_token_allowance = TIER_TOKEN_ALLOWANCE[tier];
      // Add bonus tokens on upgrade
      const bonusTokens = TIER_TOKEN_ALLOWANCE[tier] - TIER_TOKEN_ALLOWANCE[previousTier];
      if (bonusTokens > 0 && existingSub) {
        updateData.tokens_balance = (existingSub.tokens_balance || 0) + bonusTokens;

        // Log tier change transaction
        await supabaseClient.from('token_transactions').insert({
          user_id: user.id,
          transaction_type: 'tier_change',
          tokens_amount: bonusTokens,
          tokens_balance_after: (existingSub.tokens_balance || 0) + bonusTokens,
          description: `Upgraded from ${previousTier} to ${tier}`,
        });
      }
    }

    await supabaseClient
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', user.id);

    logStep("Subscription updated in database", { tier, previousTier, updated: shouldUpdateTokens });

    return new Response(JSON.stringify({
      subscribed: tier !== 'free',
      tier,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
