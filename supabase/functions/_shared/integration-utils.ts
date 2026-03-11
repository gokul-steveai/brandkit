import { ACCESS_TOKEN_EXPIRY_MS, REFRESH_TOKEN_EXPIRY_MS } from "./auth.ts";
import { sha256Hex } from "./hash.ts";
import { SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";

type TokenPrefix = 'bkat' | 'bkrt' | 'pk';
type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  success?: boolean;
  error?: string;
};

export function generateToken(prefix: TokenPrefix): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

export function validateRequiredFields(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (!body[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export async function verifyPKCE(codeVerifier: string, storedChallenge: string): Promise<boolean> {
  const verifierHash = await sha256Hex(codeVerifier);
  const hexBytes = new Uint8Array(verifierHash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const base64 = btoa(String.fromCharCode(...hexBytes));
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return base64url === storedChallenge;
}

export async function generateIntegrationIdentity(
  clientId: string,
  externalUserId?: string,
  externalWorkspaceId?: string
): Promise<string> {
  if (!externalUserId && !externalWorkspaceId) {
    throw new Error("Either externalUserId or externalWorkspaceId must be provided");
  }
  
  const accountType = externalWorkspaceId ? 'workspace' : 'user';
  const externalAccountId = externalWorkspaceId || externalUserId;
  return await sha256Hex(`${clientId}:${accountType}:${externalAccountId}`);
}

export async function syncIntegrationBrandKits(
  supabase: SupabaseClient,
  integrationId: string,
  brandKitIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (brandKitIds.length === 0) {
    return { success: true };
  }

  const { error: deleteError } = await supabase
    .from("partner_integration_brand_kits")
    .delete()
    .eq("integration_id", integrationId)
    .not("brand_kit_id", "in", `(${brandKitIds.join(",")})`);

  if (deleteError) {
    return { success: false, error: "Failed to remove old brand kit mappings" };
  }

  const { error: upsertError } = await supabase
    .from("partner_integration_brand_kits")
    .upsert(
      brandKitIds.map(id => ({
        integration_id: integrationId,
        brand_kit_id: id,
      })),
      { onConflict: "integration_id,brand_kit_id" }
    );

  if (upsertError) {
    return { success: false, error: "Failed to sync brand kit mappings" };
  }

  return { success: true };
}

export async function createTokenPair(
  supabase: SupabaseClient,
  partnerIntegrationId: string,
  scopes: string[] = ['brand_kit:read']
): Promise<TokenResponse> {
  const access_token = generateToken('bkat');
  const refresh_token = generateToken('bkrt');

  const { data: refreshTokenData, error: refreshError } = await supabase
    .from("oauth_refresh_tokens")
    .insert({
      refresh_token_hash: await sha256Hex(refresh_token),
      partner_integration_id: partnerIntegrationId,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString() // 30 days
    })
    .select("id")
    .single();

  if (refreshError || !refreshTokenData) {
    return { success: false, error: "Failed to create refresh token" };
  }

  const { error: accessError } = await supabase
    .from("oauth_access_tokens")
    .insert({
      access_token_hash: await sha256Hex(access_token),
      refresh_token_id: refreshTokenData.id,
      scopes,
      expires_at: new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS).toISOString() // 1 hour
    });

  if (accessError) {
    return { success: false, error: "Failed to create access token" };
  }

  return { success: true, access_token, refresh_token };
}

export async function revokeRefreshToken(
  supabase: SupabaseClient,
  refreshTokenId: string
): Promise<void> {
  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked: true })
    .eq("id", refreshTokenId);
}

export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
