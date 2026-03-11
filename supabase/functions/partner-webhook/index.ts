/**
 * Partner Webhook (PUSH)
 * 
 * Manages outbound webhook delivery to partner apps.
 * 
 * Routes:
 *   POST /trigger                    - Create event + deliver
 *   POST /replay/{event_id}          - Replay a delivery (admin only)
 *   GET  /deliveries?brand_kit_id=X  - List deliveries (admin only)
 */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";
import { signWebhookPayload } from "../_shared/webhook-signer.ts";
import { assembleBrandKitData } from "../_shared/partner-data.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000, 14_400_000];
const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 5;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const RESPONSE_BODY_MAX_LENGTH = 1000;

interface PartnerIntegration {
  id: string;
  partner_name: string;
  webhook_url: string;
  webhook_secret: string;
  is_active: boolean;
}

interface BrandKitLink {
  integration_id: string;
  partner_integrations: PartnerIntegration;
}

interface DeliveryResult {
  success: boolean;
  status?: number;
  error?: string;
}

interface TriggerRequest {
  brand_kit_id: string;
  event_type?: string;
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number, origin: string | null = null) {
  return jsonResponse({ error: { code, message } }, status, origin);
}

async function fetchIntegrationsDataByBrandKitId(supabase_client: SupabaseClient, brand_kit_id: string) {
  const {data, error} = await supabase_client
        .from("partner_integration_brand_kits")
        .select(`
          integration_id,
          partner_integrations!inner (
            id,
            partner_name,
            webhook_url,
            webhook_secret,
            is_active
          )
        `)
        .eq("brand_kit_id", brand_kit_id)
        .eq("partner_integrations.is_active", true);

    return {
      brandKitLinks: (data ?? []) as BrandKitLink[],
      error: error ?? null
    }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /partner-webhook/trigger, /partner-webhook/replay/{id}, /partner-webhook/deliveries
  const action = pathParts[1];

  try {
    // POST /trigger — internal, called by auto-save flows
    if (req.method === "POST" && action === "trigger") {
      // Authenticate the caller via JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return errorResponse("UNAUTHORIZED", "Missing authorization", 401, origin);
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return errorResponse("UNAUTHORIZED", "Invalid token", 401, origin);
      }

      const authenticatedUserId = claimsData.claims.sub as string;

      const body: TriggerRequest = await req.json();
      const { brand_kit_id, event_type = "brand_kit.upserted" } = body;

      if (!brand_kit_id) {
        return errorResponse("BAD_REQUEST", "brand_kit_id is required", 400, origin);
      }

      const { data: brandKit, error: brandKitError } = await serviceClient
        .from("brand_kits")
        .select("user_id")
        .eq("id", brand_kit_id)
        .maybeSingle();

      if (brandKitError || !brandKit) {
        return errorResponse("NOT_FOUND", "Brand kit not found", 404, origin);
      }

      if (brandKit.user_id !== authenticatedUserId) {
        // Check if user is a member with admin/editor role
        const { data: member } = await serviceClient
          .from("brand_kit_members")
          .select("role")
          .eq("brand_kit_id", brand_kit_id)
          .eq("user_id", authenticatedUserId)
          .in("role", ["admin", "editor"])
          .maybeSingle();

        if (!member) {
          return errorResponse("FORBIDDEN", "Access denied to this brand kit", 403, origin);
        }
      }

      // Use the authenticated user ID, not a user-supplied one
      const user_id = authenticatedUserId;

      const { brandKitLinks, error } = await fetchIntegrationsDataByBrandKitId(serviceClient, brand_kit_id)

      if (error) {
        return errorResponse("SERVER_ERROR", "Failed to fetch integrations", 500, origin);
      }

      if (!brandKitLinks || brandKitLinks.length === 0) {
        return jsonResponse({ message: "No active integrations", delivered: 0 }, 200, origin);
      }

      const integrations = brandKitLinks.map(link => link.partner_integrations);

      // Assemble payload
      const brandKitData = await assembleBrandKitData(serviceClient, brand_kit_id);
      if (!brandKitData) {
        return errorResponse("NOT_FOUND", "Brand kit not found", 404, origin);
      }

      const eventId = crypto.randomUUID();
      const payload = {
        event_id: eventId,
        event_type,
        occurred_at: new Date().toISOString(),
        ...brandKitData,
      };

      // Store event
      await serviceClient.from("webhook_events").insert({
        id: eventId,
        brand_kit_id,
        user_id,
        event_type,
        payload,
        version: brandKitData.version,
      });

      // Deliver to each integration
      const deliveryResults = await Promise.all(
        integrations.map((integration) =>
          deliverWebhook(serviceClient, eventId, integration, payload, user_id)
        )
      );

      return jsonResponse({
        event_id: eventId,
        delivered: deliveryResults.filter((r) => r.success).length,
        failed: deliveryResults.filter((r) => !r.success).length,
      }, 200, origin);
    }

    // POST /replay/{event_id} — admin only
    if (req.method === "POST" && action === "replay" && pathParts[2]) {
      const userId = await authenticateAdmin(req, supabaseUrl, anonKey, serviceClient);
      if (!userId) {
        return errorResponse("UNAUTHORIZED", "Admin access required", 401, origin);
      }

      const eventId = pathParts[2];
      const { data: event, error: eventError } = await serviceClient
        .from("webhook_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (eventError || !event) {
        return errorResponse("NOT_FOUND", "Event not found", 404, origin);
      }

      const { brandKitLinks, error } = await fetchIntegrationsDataByBrandKitId(serviceClient, event.brand_kit_id);

      if (error || !brandKitLinks || brandKitLinks.length === 0) {
        return errorResponse("NOT_FOUND", "No active integrations", 404, origin);
      }

      const integrations = brandKitLinks.map(link => link.partner_integrations);

      const results = await Promise.all(
        integrations.map((integration) =>
          deliverWebhook(serviceClient, eventId, integration, event.payload, event.user_id)
        )
      );

      return jsonResponse({
        event_id: eventId,
        replayed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      }, 200, origin);
    }

    // GET /deliveries?brand_kit_id=X
    if (req.method === "GET" && action === "deliveries") {
      const userId = await authenticateAdmin(req, supabaseUrl, anonKey, serviceClient);
      if (!userId) {
        return errorResponse("UNAUTHORIZED", "Admin access required", 401, origin);
      }

      const brandKitId = url.searchParams.get("brand_kit_id");
      const status = url.searchParams.get("status");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT)), MAX_LIMIT);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = serviceClient
        .from("webhook_deliveries")
        .select(`
          *,
          webhook_events!inner(event_type, brand_kit_id, created_at, version)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (brandKitId) {
        query = query.eq("webhook_events.brand_kit_id", brandKitId);
      }
      if (status) {
        query = query.eq("status", status);
      }

      const { data: deliveries, error } = await query;
      if (error) {
        return errorResponse("SERVER_ERROR", "Failed to fetch deliveries", 500, origin);
      }

      return jsonResponse({ data: deliveries || [], pagination: { limit, offset } }, 200, origin);
    }

    return errorResponse("NOT_FOUND", "Endpoint not found", 404, origin);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse("BAD_REQUEST", "Invalid JSON", 400, origin);
    }
    return errorResponse("SERVER_ERROR", "Internal server error", 500, origin);
  }
});

// ========== HELPERS ==========

async function authenticateAdmin(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) return null;

  const userId = data.claims.sub as string;

  const { data: roleData, error: roleError } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError || !roleData || roleData.role !== "admin") return null;
  return userId;
}

async function deliverWebhook(
  supabase: SupabaseClient,
  eventId: string,
  integration: PartnerIntegration,
  payload: unknown,
  userId: string
): Promise<DeliveryResult> {
  const { webhook_url, webhook_secret, id: integrationId } = integration;

  if (!webhook_url || !webhook_secret) {
    return { success: false, error: "Missing webhook URL or secret" };
  }

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signWebhookPayload(body, webhook_secret, timestamp);

  const { data: delivery, error: deliveryError } = await supabase
    .from("webhook_deliveries")
    .insert({
      event_id: eventId,
      integration_id: integrationId,
      user_id: userId,
      status: "pending",
      attempt_count: 1,
      max_attempts: MAX_ATTEMPTS,
    })
    .select()
    .single();

  if (deliveryError || !delivery) {
    return { success: false, error: "Failed to create delivery record" };
  }

  try {
    const response = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": String(timestamp),
        "X-Signature": signature,
        "X-Event-Type": (payload as Record<string, unknown>).event_type as string || "unknown",
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const responseBody = await response.text().catch(() => "");
    const truncatedBody = responseBody.slice(0, RESPONSE_BODY_MAX_LENGTH);

    if (response.ok) {
      await supabase
        .from("webhook_deliveries")
        .update({
          status: "success",
          response_status: response.status,
          response_body: truncatedBody,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);

      return { success: true, status: response.status };
    }

    const nextRetryDelay = RETRY_DELAYS_MS[0] || 60_000;
    await supabase
      .from("webhook_deliveries")
      .update({
        status: "failed",
        response_status: response.status,
        response_body: truncatedBody,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + nextRetryDelay).toISOString(),
        error_message: `HTTP ${response.status}`,
      })
      .eq("id", delivery.id);

    return { success: false, status: response.status, error: `HTTP ${response.status}` };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const nextRetryDelay = RETRY_DELAYS_MS[0] || 60_000;
    
    await supabase
      .from("webhook_deliveries")
      .update({
        status: "failed",
        last_attempt_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + nextRetryDelay).toISOString(),
        error_message: errorMessage,
      })
      .eq("id", delivery.id);

    return { success: false, error: errorMessage };
  }
}
