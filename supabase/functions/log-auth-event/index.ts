import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

interface AuthEventRequest {
  action: "login" | "logout" | "signup" | "password_reset" | "password_reset_request";
  user_id?: string;
  email?: string;
  details?: Record<string, unknown>;
  status?: "success" | "error";
}

// Actions that can be logged without authentication (pre-auth events)
const UNAUTHENTICATED_ACTIONS = ["login", "signup"] as const;

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AuthEventRequest = await req.json();

    let {
      action,
      user_id,
      email,
      details = {},
      status = "success",
    } = body;

    // SECURITY: For authenticated actions, require and verify JWT
    // This prevents malicious actors from injecting fake audit log entries
    const isUnauthenticatedAction = UNAUTHENTICATED_ACTIONS.includes(action as typeof UNAUTHENTICATED_ACTIONS[number]);

    if (!isUnauthenticatedAction) {
      const authHeader = req.headers.get("Authorization");

      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization required for this action" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify the JWT token
      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // CRITICAL: Override user_id with authenticated user to prevent spoofing
      // This ensures the audit log accurately reflects who performed the action
      user_id = user.id;
      email = email || user.email;
    }

    // Get IP and user agent from request headers
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log("Logging auth event:", { action, user_id, email, status, ipAddress });

    // Insert audit log entry
    const { error: insertError } = await supabase.from("audit_logs").insert({
      user_id: user_id || null,
      action,
      resource_type: "auth",
      resource_id: null,
      details: {
        email,
        ...details,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      status,
    });

    if (insertError) {
      console.error("Error inserting audit log:", insertError);
      throw new Error("Failed to log auth event");
    }

    console.log("Auth event logged successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in log-auth-event function:", errorMessage);

    return new Response(
      JSON.stringify({ error: "Failed to log event" }), // Don't leak internal error details
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get("origin")) } }
    );
  }
});
