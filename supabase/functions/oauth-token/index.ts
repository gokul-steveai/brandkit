import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { errorResponse, jsonResponse } from '../_shared/response.ts';
import { sha256Hex } from "../_shared/hash.ts";
import { validateRequiredFields, verifyPKCE, createTokenPair, revokeRefreshToken } from "../_shared/integration-utils.ts";
import {ACCESS_TOKEN_EXPIRY_MS, SUPPORTED_GRANT_TYPES} from '../_shared/auth.ts'


Deno.serve(async (req: Request) => {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    try {
        const requestBody = await req.json();
        const { client_id: clientId, code: authorizationCode, grant_type: grantType, refresh_token: refreshToken, code_verifier: codeVerifier } = requestBody;

        if (!grantType || !SUPPORTED_GRANT_TYPES.includes(grantType)) {
            return errorResponse("BAD_REQUEST", "Invalid or missing grant_type", 400);
        }

        if (grantType === "authorization_code") {
            const validationError = validateRequiredFields(requestBody, ['client_id', 'code', 'code_verifier']);
            if (validationError) {
                return errorResponse("BAD_REQUEST", validationError, 400);
            }

            const codeHash = await sha256Hex(authorizationCode);
            const { data: authorizationCodeData, error: codeError } = await supabase
                .from("oauth_codes")
                .select("partner_integration_id, expires_at, used, code_challenge, scopes")
                .eq("code_hash", codeHash)
                .eq("client_id", clientId)
                .maybeSingle();

            if (codeError) {
                return errorResponse("SERVER_ERROR", "Database error", 500);
            }

            if (!authorizationCodeData || authorizationCodeData.used) {
                return errorResponse("INVALID_GRANT", "Invalid or used authorization code", 400);
            }

            if (new Date(authorizationCodeData.expires_at) < new Date()) {
                return errorResponse("INVALID_GRANT", "Authorization code expired", 400);
            }

            if (!await verifyPKCE(codeVerifier, authorizationCodeData.code_challenge)) {
                return errorResponse("INVALID_GRANT", "Invalid code_verifier", 400);
            }

            const { data: oauthClient, error: clientError } = await supabase
                .from("oauth_clients")
                .select("is_active")
                .eq("client_id", clientId)
                .eq("is_active", true)
                .maybeSingle();

            if (clientError || !oauthClient) {
                return errorResponse("INVALID_CLIENT", "Invalid or inactive client", 401);
            }

            const tokenResult = await createTokenPair(
                supabase,
                authorizationCodeData.partner_integration_id,
                authorizationCodeData.scopes || ['brand_kit:read']
            );

            if (!tokenResult.success) {
                return errorResponse("SERVER_ERROR", tokenResult.error || "Failed to create tokens", 500);
            }

            await supabase
                .from("oauth_codes")
                .update({ used: true })
                .eq("code_hash", codeHash);

            return jsonResponse({
                access_token: tokenResult.access_token,
                refresh_token: tokenResult.refresh_token,
                token_type: "Bearer",
                expires_in: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000)
            });
        }

        if (grantType === "refresh_token") {
            const validationError = validateRequiredFields(requestBody, ['client_id', 'refresh_token']);
            if (validationError) {
                return errorResponse("BAD_REQUEST", validationError, 400);
            }

            const refreshTokenHash = await sha256Hex(refreshToken);
            const { data: refreshTokenData, error: tokenError } = await supabase
                .from("oauth_refresh_tokens")
                .select("id, partner_integration_id, expires_at, revoked")
                .eq("refresh_token_hash", refreshTokenHash)
                .maybeSingle();

            if (tokenError) {
                return errorResponse("SERVER_ERROR", "Database error", 500);
            }

            if (!refreshTokenData || refreshTokenData.revoked) {
                return errorResponse("INVALID_GRANT", "Invalid or revoked refresh token", 401);
            }

            if (new Date(refreshTokenData.expires_at) < new Date()) {
                return errorResponse("INVALID_GRANT", "Refresh token expired", 401);
            }

            const tokenResult = await createTokenPair(
                supabase,
                refreshTokenData.partner_integration_id
            );

            if (!tokenResult.success) {
                return errorResponse("SERVER_ERROR", tokenResult.error || "Failed to create tokens", 500);
            }

            await revokeRefreshToken(supabase, refreshTokenData.id);

            return jsonResponse({
                access_token: tokenResult.access_token,
                refresh_token: tokenResult.refresh_token,
                token_type: "Bearer",
                expires_in: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000)
            });
        }

        return errorResponse("UNSUPPORTED_GRANT_TYPE", "Unsupported grant type", 400);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
        }
        return errorResponse("SERVER_ERROR", "Internal server error", 500);
    }
});
