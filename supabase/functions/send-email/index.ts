import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { checkUserRole } from "../_shared/auth.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  categories?: string[];
  customArgs?: Record<string, string>;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    // ========== SECURITY: Validate JWT ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user authentication
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

    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: EmailRequest = await req.json();

    const {
      to,
      subject,
      html,
      text,
      from = "noreply@brandkitos.com",
      fromName = "Brand Kit OS",
      templateId,
      dynamicTemplateData,
      categories = [],
      customArgs = {},
    } = body;

    // Validate required fields
    if (!to) {
      return new Response(
        JSON.stringify({ error: "Recipient email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!subject && !templateId) {
      return new Response(
        JSON.stringify({ error: "Subject is required when not using a template" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!html && !text && !templateId) {
      return new Response(
        JSON.stringify({ error: "Email content (html or text) is required when not using a template" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========== SECURITY: Restrict recipients ==========
    // Only admins can send to arbitrary addresses
    // Regular users can only send emails to themselves
    const toAddresses = Array.isArray(to) ? to : [to];

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const isAdmin = await checkUserRole(supabaseService, user.id, "admin");

    if (!isAdmin) {
      // Non-admins can only send to their own email
      const userEmail = user.email?.toLowerCase();
      const isOnlyToSelf = toAddresses.every(addr => addr.toLowerCase() === userEmail);

      if (!isOnlyToSelf) {
        console.log(`User ${user.id} attempted to send email to unauthorized recipients:`, toAddresses);
        return new Response(
          JSON.stringify({ error: "You can only send emails to your own address" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Build the SendGrid payload
    const personalizations = toAddresses.map((email) => ({
      to: [{ email }],
      ...(dynamicTemplateData && { dynamic_template_data: dynamicTemplateData }),
      ...(Object.keys(customArgs).length > 0 && { custom_args: customArgs }),
    }));

    const sendgridPayload: Record<string, unknown> = {
      personalizations,
      from: { email: from, name: fromName },
      ...(categories.length > 0 && { categories }),
    };

    // Use template or raw content
    if (templateId) {
      sendgridPayload.template_id = templateId;
    } else {
      sendgridPayload.subject = subject;
      sendgridPayload.content = [];
      if (text) {
        (sendgridPayload.content as Array<{ type: string; value: string }>).push({ type: "text/plain", value: text });
      }
      if (html) {
        (sendgridPayload.content as Array<{ type: string; value: string }>).push({ type: "text/html", value: html });
      }
    }

    console.log("Sending email via SendGrid:", { userId: user.id, to: toAddresses, subject, templateId });

    const response = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendgridPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }), // Don't leak SendGrid errors
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the message ID from response headers
    const messageId = response.headers.get("X-Message-Id");

    console.log("Email sent successfully:", { messageId, userId: user.id, to: toAddresses });

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        recipients: toAddresses.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-email function:", errorMessage);

    return new Response(
      JSON.stringify({ error: "Failed to process request" }), // Generic error for security
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get("origin")) } }
    );
  }
});
