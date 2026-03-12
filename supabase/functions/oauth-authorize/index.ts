import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { errorResponse, corsHeaders, jsonResponse } from '../_shared/response.ts';
import { isValidUUID } from "../_shared/auth.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { generateIntegrationIdentity, syncIntegrationBrandKits } from "../_shared/integration-utils.ts";

const AUTHORIZATION_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SUPPORTED_CODE_CHALLENGE_METHOD = 'S256';

interface AuthorizeRequest {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    state?: string;
    brand_kit_ids: string[];
    external_user_id?: string;
    external_workspace_id?: string;
    scope?: string;
}

function validateAuthRequest(body: Partial<AuthorizeRequest>, skipBrandKitValidation = false): string | null {
    if (!body.client_id) return "Missing client_id";
    if (!body.redirect_uri) return "Missing redirect_uri";
    if (!skipBrandKitValidation) {
        if (!body.brand_kit_ids || !Array.isArray(body.brand_kit_ids) || body.brand_kit_ids.length === 0) {
            return "Missing or invalid brand_kit_ids";
        }
        for (const id of body.brand_kit_ids) {
            if (!isValidUUID(id)) {
                return `Invalid brand kit ID: ${id}`;
            }
        }
    }
    if (!body.code_challenge) return "Missing code_challenge";
    if (!body.code_challenge_method) return "Missing code_challenge_method";
    if (body.code_challenge_method !== SUPPORTED_CODE_CHALLENGE_METHOD) {
        return `Only ${SUPPORTED_CODE_CHALLENGE_METHOD} code_challenge_method supported`;
    }
    return null;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    try {
        if (req.method !== "POST") {
            return errorResponse('METHOD_NOT_ALLOWED', 'Only POST method allowed', 405);
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return errorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !userData.user) {
            return errorResponse("UNAUTHORIZED", "Invalid authentication token", 401);
        }

        const body: Partial<AuthorizeRequest> = await req.json();
        
        const {
            client_id,
            redirect_uri,
            state,
            brand_kit_ids,
            external_user_id,
            external_workspace_id,
            code_challenge,
            code_challenge_method,
            scope = 'brand_kit:read'
        } = body;

        if (!external_user_id && !external_workspace_id) {
            return errorResponse('BAD_REQUEST', 'Either external_user_id or external_workspace_id is required', 400);
        }

        const integrationIdentity = await generateIntegrationIdentity(
            client_id!,
            external_user_id,
            external_workspace_id
        );

        // Check if integration already exists
        let { data: existingIntegration, error: integrationCheckError } = await supabase
            .from("partner_integrations")
            .select(`
                id,
                oauth_refresh_tokens (
                    id,
                    expires_at,
                    revoked,
                    oauth_access_tokens (
                        expires_at,
                        revoked
                    )
                )
            `)
            .eq("integration_identity", integrationIdentity)
            .eq("client_id", client_id)
            .eq("is_active", true)
            .maybeSingle();

        if (integrationCheckError) {
            return errorResponse("SERVER_ERROR", "Database error", 500);
        }

        // If integration exists, skip brand kit validation
        const skipBrandKitValidation = !!existingIntegration;
        const validationError = validateAuthRequest(body, skipBrandKitValidation);
        
        if (validationError) {
            return errorResponse('BAD_REQUEST', validationError, 400);
        }

        const user = userData.user;

        const { data: client, error: clientError } = await supabase
            .from("oauth_clients")
            .select("client_id, partner_name, redirect_uris")
            .eq("client_id", client_id)
            .eq("is_active", true)
            .maybeSingle();

        if (clientError || !client) {
            return errorResponse("INVALID_CLIENT", "Invalid or inactive client", 400);
        }

        if (!client.redirect_uris.includes(decodeURIComponent(redirect_uri ?? ''))) {
            return errorResponse("INVALID_REDIRECT_URI", "Redirect URI not registered for this client", 400);
        }

        // Validate brand kits if provided
        if (brand_kit_ids && brand_kit_ids.length > 0) {
            const { data: brandKits, count, error: brandKitError } = await supabase
                .from("brand_kits")
                .select("id", { count: 'exact' })
                .in("id", brand_kit_ids)
                .eq("user_id", user.id);

            if (brandKitError || !brandKits || count !== brand_kit_ids?.length) {
                return errorResponse("ACCESS_DENIED", "One or more brand kits not found or access denied", 403);
            }
        }

        let { data: integration } = await supabase
            .from("partner_integrations")
            .select("id")
            .eq("integration_identity", integrationIdentity)
            .eq("client_id", client_id)
            .maybeSingle();

        // Create new integration if none exists
        if (!integration) {
            const { data: newIntegration, error: integrationError } = await supabase
                .from("partner_integrations")
                .insert({
                    user_id: user.id,
                    client_id: client_id,
                    partner_name: client.partner_name,
                    integration_identity: integrationIdentity,
                    external_user_id: external_user_id || null,
                    external_workspace_id: external_workspace_id || null,
                    is_active: true
                })
                .select("id")
                .single();

            if (integrationError || !newIntegration) {
                return errorResponse("SERVER_ERROR", "Failed to create integration", 500);
            }
            
            integration = newIntegration;
        }

        // Sync brand kits if provided
        if (brand_kit_ids && brand_kit_ids.length > 0) {
            const {success, error} = await syncIntegrationBrandKits(
                supabase,
                integration.id,
                brand_kit_ids
            );

            if(!success) {
                return errorResponse(
                    "SERVER_ERROR", 
                    error ?? "Failed to create brand kits integration mapping", 
                    500
                );
            }
        }

        // Generate authorization code for token exchange
        const code = crypto.randomUUID();
        const codeHash = await sha256Hex(code);

        const { error: codeError } = await supabase
            .from("oauth_codes")
            .insert({
                code_hash: codeHash,
                client_id,
                partner_integration_id: integration.id,
                code_challenge,
                code_challenge_method,
                scopes: scope.split(' '),
                expires_at: new Date(Date.now() + AUTHORIZATION_CODE_EXPIRY_MS).toISOString()
            })
            .select();

        if (codeError) {
            return errorResponse("SERVER_ERROR", "Failed to create authorization code", 500);
        }

        return jsonResponse({ 
            code, 
            state
        });

    } catch (error) {
        if (error instanceof SyntaxError) {
            return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
        }
        return errorResponse("SERVER_ERROR", "Internal server error", 500);
    }
});