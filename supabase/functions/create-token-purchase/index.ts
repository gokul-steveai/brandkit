import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { validateJWT } from "../_shared/auth.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-TOKEN-PURCHASE] ${step}`, details ? JSON.stringify(details) : '');
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
    const authResult = await validateJWT(
      authHeader,
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    if (!authResult.valid || !authResult.user) {
      throw new Error(authResult.error || "Unauthorized");
    }

    const user = authResult.user;

    if (!user.email) throw new Error("User email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, tokenPackId, tokensAmount } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request parsed", { priceId, tokenPackId, tokensAmount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const requestOrigin = req.headers.get("origin") || "https://brandkitos.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${requestOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=tokens`,
      cancel_url: `${requestOrigin}/payment-canceled`,
      metadata: {
        user_id: user.id,
        token_pack_id: tokenPackId,
        tokens_amount: String(tokensAmount),
        purchase_type: "token_purchase",
      },
    });

    logStep("Token purchase session created", { sessionId: session.id, url: session.url });

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
