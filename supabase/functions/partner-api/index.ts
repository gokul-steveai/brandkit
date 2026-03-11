/**
 * Partner API (PULL)
 * 
 * Provides read-only access for partner apps (Leafpad) to fetch Brand Kit data.
 * Auth: Bearer PARTNER_API_KEY header.
 * 
 * Routes:
 *   GET  /v1/brand-kits/{id}                  - Get single brand kit
 *   GET  /v1/brand-kits?external_user_id=X     - List by partner user
 *   GET  /v1/brand-kits?external_workspace_id=X - List by partner workspace
 *   POST /v1/integrations/partner/link         - Link partner IDs
 */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";
import { assembleBrandKitData } from "../_shared/partner-data.ts";
import { isValidExternalUrl, isValidUUID, sanitizeString } from "../_shared/auth.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { generateToken, generateIntegrationIdentity, secureCompare } from "../_shared/integration-utils.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type AuthMethod = "per_partner" | "global_key" | "oauth_token";

interface AuthContext {
  method: AuthMethod;
  integrationId?: string;
  partnerName?: string;
  brandKitId?: string;
  externalUserId?: string | null;
  externalWorkspaceId?: string | null;
  user_id?: string;
}

interface LinkPartnerRequest {
  brand_kit_ids?: string | string[];
  webhook_url?: string;
  external_user_id?: string;
  external_workspace_id?: string;
  client_id?: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status);
}

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

async function authenticateRequest(
  token: string,
  supabase: SupabaseClient
): Promise<AuthContext | Response> {
  const tokenHash = await sha256Hex(token);

  if (token.startsWith("pk_")) {
    const { data: partner, error } = await supabase
      .from("partner_integrations")
      .select("id, partner_name, brand_kit_id, user_id")
      .eq("key_hash", tokenHash)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !partner) {
      return errorResponse("UNAUTHORIZED", "Invalid or inactive partner key", 401);
    }

    return {
      method: "per_partner",
      integrationId: partner.id,
      partnerName: partner.partner_name,
      brandKitId: partner.brand_kit_id,
      user_id: partner?.user_id
    };
  }

  if (token.startsWith("bkat_")) {
    const { data: accessToken, error } = await supabase
      .from("oauth_access_tokens")
      .select(`
        id,
        expires_at,
        revoked,
        oauth_refresh_tokens!inner (
          partner_integrations (
            id,
            partner_name,
            brand_kit_id,
            external_user_id,
            external_workspace_id,
            oauth_clients!inner (is_active),
            user_id
          )
        )
      `)
      .eq("access_token_hash", tokenHash)
      .eq("revoked", false)
      .maybeSingle();

    if (error || !accessToken) {
      return errorResponse("UNAUTHORIZED", "Invalid access token", 401);
    }

    if (new Date(accessToken.expires_at).getTime() <= Date.now()) {
      return errorResponse("UNAUTHORIZED", "Access token expired", 401);
    }

    const integration = accessToken.oauth_refresh_tokens?.partner_integrations;
    const client = integration?.oauth_clients;

    if (!client?.is_active) {
      return errorResponse("UNAUTHORIZED", "OAuth client inactive", 401);
    }

    return {
      method: "oauth_token",
      integrationId: integration?.id,
      partnerName: integration?.partner_name,
      brandKitId: integration?.brand_kit_id,
      externalUserId: integration?.external_user_id,
      externalWorkspaceId: integration?.external_workspace_id,
      user_id: integration?.user_id
    };
  }

  /**
   * Global Partner API Key Authentication (Legacy Fallback)
   */
  const globalApiKey = Deno.env.get("PARTNER_API_KEY");
  if (!globalApiKey || !secureCompare(token, globalApiKey)) {
    return errorResponse("UNAUTHORIZED", "Invalid API key", 401);
  }

  return { method: "global_key" };
}

async function getBrandKitById(
  supabase: SupabaseClient,
  brandKitId: string
): Promise<Response> {
  if (!isValidUUID(brandKitId)) {
    return errorResponse("INVALID_ID", "Invalid brand kit ID format", 400);
  }

  const data = await assembleBrandKitData(supabase, brandKitId);
  if (!data) {
    return errorResponse("NOT_FOUND", "Brand kit not found", 404);
  }

  return jsonResponse(data);
}

async function listBrandKits(
  supabase: SupabaseClient,
  authContext: AuthContext,
  searchParams: URLSearchParams
): Promise<Response> {
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
    MAX_LIMIT
  );
  const offset = parseInt(searchParams.get("offset") || "0");

  let externalUserId: string | null;
  let externalWorkspaceId: string | null;

  // Determine external IDs based on auth method - OAuth tokens use stored IDs, others use query params
  if (authContext.method === "oauth_token") {
    externalUserId = authContext.externalUserId ?? searchParams.get("external_user_id");
    externalWorkspaceId = authContext.externalWorkspaceId ?? searchParams.get("external_workspace_id");
  } else {
    externalUserId = searchParams.get("external_user_id");
    externalWorkspaceId = searchParams.get("external_workspace_id");
  }

  if (!externalUserId && !externalWorkspaceId) {
    return errorResponse(
      "BAD_REQUEST",
      "Provide external_user_id or external_workspace_id",
      400
    );
  }

  let query = supabase
    .from("partner_integrations")
    .select("id")
    .eq("is_active", true);

  if (authContext.method !== "oauth_token") {
    query = query.eq("partner_name", authContext?.partnerName ?? "leafpad");
  }

  if (externalUserId) query = query.eq("external_user_id", externalUserId);
  if (externalWorkspaceId) query = query.eq("external_workspace_id", externalWorkspaceId);

  const { data: integrations, error } = await query;
  
  if (error) {
    return errorResponse("SERVER_ERROR", "Failed to query integrations", 500);
  }

  if (!integrations || integrations.length === 0) {
    return jsonResponse({
      data: [],
      pagination: { limit, offset, count: 0 },
    });
  }

  const integrationIds = integrations.map((i: { id: string }) => i.id);

  const { data: brandKitLinks, error: brandKitError } = await supabase
    .from("partner_integration_brand_kits")
    .select("brand_kit_id")
    .in("integration_id", integrationIds)
    .range(offset, offset + limit - 1);

  if (brandKitError) {
    return errorResponse("SERVER_ERROR", "Failed to query brand kits", 500);
  }

  const brandKitIds = (brandKitLinks || []).map((link: { brand_kit_id: string }) => link.brand_kit_id);
  const results = await Promise.all(
    brandKitIds.map((id: string) => assembleBrandKitData(supabase, id))
  );

  return jsonResponse({
    data: results.filter(Boolean),
    pagination: { limit, offset, count: results.filter(Boolean).length },
  });
}

function validateBrandKitIds(brand_kit_ids?: string | string[]): string[] {
  if (!brand_kit_ids) return [];

  const ids = Array.isArray(brand_kit_ids) ? brand_kit_ids : [brand_kit_ids];
  
  if (ids.length === 0) {
    throw new Error("brand_kit_ids cannot be empty");
  }

  for (const id of ids) {
    if (!isValidUUID(id)) {
      throw new Error(`Invalid brand_kit_id: ${id}`);
    }
  }
  return ids;
}

async function validateBrandKitsOwnership(
  supabase: SupabaseClient,
  userId: string,
  brandKitIds: string[]
): Promise<void> {
  const { data: brandKits, error } = await supabase
    .from("brand_kits")
    .select("id")
    .eq("user_id", userId)
    .in("id", brandKitIds);

  if (error || !brandKits || brandKits.length !== brandKitIds.length) {
    throw new Error("One or more brand kits not found or not owned by user");
  }
}

async function updateBrandKitMappings(
  supabase: SupabaseClient,
  integrationId: string,
  brandKitIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("partner_integration_brand_kits")
    .delete()
    .eq("integration_id", integrationId);

  if (deleteError) {
    throw new Error("Failed to delete existing brand kit mappings");
  }

  if (brandKitIds.length === 0) return;

  const links = brandKitIds.map(bkId => ({
    integration_id: integrationId,
    brand_kit_id: bkId,
  }));

  const { error: insertError } = await supabase
    .from("partner_integration_brand_kits")
    .insert(links);

  if (insertError) {
    throw new Error("Failed to insert brand kit mappings");
  }
}

async function linkPartnerIntegration(
  supabase: SupabaseClient,
  authContext: AuthContext,
  body: LinkPartnerRequest
): Promise<Response> {
  try {
    const brandKitIds = validateBrandKitIds(body.brand_kit_ids);

    const external_user_id = sanitizeString(body.external_user_id, 255);
    const external_workspace_id = sanitizeString(body.external_workspace_id, 255);
    const client_id = sanitizeString(body.client_id, 255) || 'leafpad';

    if (!external_user_id && !external_workspace_id) {
      return errorResponse("BAD_REQUEST", "Provide external_user_id or external_workspace_id", 400);
    }

    const { data: clientData, error: fetchClientError } = await supabase
      .from("oauth_clients")
      .select("is_active, partner_name")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .maybeSingle();

    if (fetchClientError || !clientData) {
      return errorResponse("BAD_REQUEST", "Invalid or inactive client_id", 400);
    }

    if (body.webhook_url !== undefined && body.webhook_url !== null) {
      if (typeof body.webhook_url !== "string" || !isValidExternalUrl(body.webhook_url)) {
        return errorResponse("BAD_REQUEST", "webhook_url must be a valid external HTTPS URL", 400);
      }
    }

    let userId: string | null = null;

    if (brandKitIds.length > 0) {
      if (!authContext.user_id) {
        return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
      }
      userId = authContext.user_id;
      await validateBrandKitsOwnership(supabase, userId, brandKitIds);
    }

    const webhookSecret = crypto.randomUUID() + "-" + crypto.randomUUID();
    const partnerApiKey = generateToken('pk');
    const partnerKeyHash = await sha256Hex(partnerApiKey);
    const partnerKeyPrefix = partnerApiKey.slice(0, 11);
    const integrationIdentity = await generateIntegrationIdentity(
      client_id,
      external_user_id || undefined,
      external_workspace_id || undefined
    );

    const { data: integration, error } = await supabase
      .from("partner_integrations")
      .upsert(
        {
          brand_kit_id: null,
          client_id,
          integration_identity: integrationIdentity,
          user_id: userId,
          partner_name: clientData.partner_name || "leafpad",
          external_user_id: external_user_id || null,
          external_workspace_id: external_workspace_id || null,
          webhook_url: body.webhook_url || null,
          webhook_secret: webhookSecret,
          key_hash: partnerKeyHash,
          key_prefix: partnerKeyPrefix,
          is_active: true,
        },
        { onConflict: "integration_identity,client_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      return errorResponse("SERVER_ERROR", `Failed to create integration: ${error.message}`, 500);
    }

    if (brandKitIds.length > 0) {
      await updateBrandKitMappings(supabase, integration.id, brandKitIds);
    }

    await logRequest(supabase, "POST", "/v1/integrations/partner/link", brandKitIds[0] || null);

    return jsonResponse({
      integration: { ...integration, webhook_secret: undefined, key_hash: undefined, integration_identity: null },
      webhook_secret: webhookSecret,
      partner_api_key: partnerApiKey,
      brand_kit_ids: brandKitIds,
      message: "Save these credentials — they will not be shown again.",
    }, 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse("BAD_REQUEST", error.message, 400);
    }
    return errorResponse("SERVER_ERROR", "Internal server error", 500);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return errorResponse("UNAUTHORIZED", "Missing access token", 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authResponse = await authenticateRequest(token, supabase);
  if (authResponse instanceof Response) {
    return authResponse;
  }

  if (!checkRateLimit(token)) {
    return errorResponse("RATE_LIMITED", "Too many requests. Limit: 60/min", 429);
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const version = pathParts[1];
    const resource = pathParts[2];
    const resourceId = pathParts[3];

    if (version !== "v1") {
      return errorResponse("NOT_FOUND", "API version not found", 404);
    }

    if (req.method === "GET" && resource === "brand-kits") {
      if (resourceId) {
        return await getBrandKitById(supabase, resourceId);
      }
      return await listBrandKits(supabase, authResponse, url.searchParams);
    }

    // POST /v1/integrations/partner/link
    if (req.method === "POST" && resource === "integrations" && pathParts[3] === "partner" && pathParts[4] === "link") {
      const body = await req.json();
      return await linkPartnerIntegration(supabase, authResponse, body);
    }

    return errorResponse("NOT_FOUND", "Endpoint not found", 404);
  } catch (error) {
    return errorResponse("SERVER_ERROR", "Internal server error", 500);
  }
});

async function logRequest(
  supabase: ReturnType<typeof createClient>,
  method: string,
  path: string,
  brandKitId: string | null
) {
  try {
    await supabase.from("audit_logs").insert({
      action: `partner_api:${method}`,
      resource_type: "partner_api",
      resource_id: brandKitId,
      details: { path, partner: "leafpad" },
      status: "success",
    });
  } catch {
    // Non-critical, don't fail the request
  }
}
