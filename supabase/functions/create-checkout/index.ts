import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, tier } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request parsed", { priceId, tier });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // First check for stored stripe_customer_id (Phase 2: Customer ID Binding)
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    // If not found, fall back to email lookup
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer by email", { customerId });
        
        // Store for future lookups
        await supabaseClient
          .from("user_subscriptions")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
      }
    } else {
      logStep("Using stored stripe_customer_id", { customerId });
    }

    // Validate origin for redirect URLs (Phase 4: Origin Hardening)
    const requestOrigin = req.headers.get("origin");
    const allowedOrigins = [
      "https://brandkitos.lovable.app",
      "https://brandkit-os.lovable.app",
      "https://www.brandkitos.com",
      "https://brandkitos.com",
    ];
    const isLovablePreview = requestOrigin && /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(requestOrigin);
    const isLovableProject = requestOrigin && /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(requestOrigin);
    
    const redirectOrigin = (requestOrigin && (allowedOrigins.includes(requestOrigin) || isLovablePreview || isLovableProject))
      ? requestOrigin
      : "https://brandkitos.lovable.app";
    
    logStep("Using origin for redirects", { requestOrigin, redirectOrigin });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${redirectOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectOrigin}/payment-canceled`,
      metadata: {
        user_id: user.id,
        tier: tier || "base",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: tier || "base",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
