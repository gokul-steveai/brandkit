import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SendGrid webhook event types
type SendGridEventType = 
  | "processed" 
  | "dropped" 
  | "delivered" 
  | "deferred" 
  | "bounce" 
  | "open" 
  | "click" 
  | "spam_report" 
  | "unsubscribe" 
  | "group_unsubscribe" 
  | "group_resubscribe";

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: SendGridEventType;
  sg_message_id?: string;
  sg_event_id?: string;
  category?: string[];
  reason?: string;
  status?: string;
  response?: string;
  url?: string;
  useragent?: string;
  ip?: string;
  // Custom args passed when sending
  user_id?: string;
  brand_kit_id?: string;
  email_type?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const events: SendGridEvent[] = await req.json();
    
    console.log(`Received ${events.length} SendGrid webhook events`);

    // Process each event
    for (const event of events) {
      console.log("Processing SendGrid event:", {
        type: event.event,
        email: event.email,
        messageId: event.sg_message_id,
        timestamp: new Date(event.timestamp * 1000).toISOString(),
      });

      // Map SendGrid events to audit actions
      const actionMap: Record<SendGridEventType, string> = {
        processed: "email_processed",
        dropped: "email_dropped",
        delivered: "email_delivered",
        deferred: "email_deferred",
        bounce: "email_bounced",
        open: "email_opened",
        click: "email_clicked",
        spam_report: "email_spam_reported",
        unsubscribe: "email_unsubscribed",
        group_unsubscribe: "email_group_unsubscribed",
        group_resubscribe: "email_group_resubscribed",
      };

      // Log the event to audit_logs
      const { error: logError } = await supabase.from("audit_logs").insert({
        user_id: event.user_id || null,
        action: actionMap[event.event] || `email_${event.event}`,
        resource_type: "email",
        resource_id: event.sg_message_id || null,
        details: {
          email: event.email,
          event_type: event.event,
          message_id: event.sg_message_id,
          event_id: event.sg_event_id,
          category: event.category,
          reason: event.reason,
          status: event.status,
          response: event.response,
          url: event.url,
          useragent: event.useragent,
          ip: event.ip,
          brand_kit_id: event.brand_kit_id,
          email_type: event.email_type,
        },
        ip_address: event.ip || null,
        user_agent: event.useragent || null,
        status: event.event === "delivered" ? "success" : 
                ["bounce", "dropped", "spam_report"].includes(event.event) ? "error" : 
                "info",
      });

      if (logError) {
        console.error("Error logging SendGrid event:", logError);
      }

      // Handle specific events that need action
      if (event.event === "bounce" || event.event === "spam_report") {
        // Log critical email issues for follow-up
        console.warn(`Critical email event: ${event.event} for ${event.email}`, {
          reason: event.reason,
          status: event.status,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing SendGrid webhook:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
