import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
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
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    logStep("Verifying session", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", {
      status: session.payment_status,
      mode: session.mode,
      metadata: session.metadata
    });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({
        success: false,
        error: "Payment not completed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle token purchase
    if (session.metadata?.purchase_type === "token_purchase") {
      const tokensAmount = parseInt(session.metadata.tokens_amount || "0", 10);
      const userId = session.metadata.user_id;

      if (tokensAmount > 0 && userId === user.id) {
        // Get current balance
        const { data: subData } = await supabaseClient
          .from('user_subscriptions')
          .select('tokens_balance')
          .eq('user_id', userId)
          .single();

        const currentBalance = subData?.tokens_balance || 0;
        const newBalance = currentBalance + tokensAmount;

        // Update balance
        await supabaseClient
          .from('user_subscriptions')
          .update({
            tokens_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        // Log transaction
        await supabaseClient.from('token_transactions').insert({
          user_id: userId,
          transaction_type: 'token_purchase',
          tokens_amount: tokensAmount,
          tokens_balance_after: newBalance,
          description: `Purchased ${tokensAmount} tokens`,
          metadata: {
            stripe_session_id: sessionId,
            token_pack_id: session.metadata.token_pack_id,
          },
        });

        logStep("Tokens added", { tokensAmount, newBalance });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      payment_status: session.payment_status,
      mode: session.mode,
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
