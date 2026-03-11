/**
 * Webhook HMAC Signing Utility
 * 
 * Signs outbound webhook payloads with HMAC-SHA256.
 * Partner verifies: HMAC_SHA256(timestamp + "." + body, secret) === signature
 */

/**
 * Generate HMAC-SHA256 signature for webhook delivery
 */
export async function signWebhookPayload(
  body: string,
  secret: string,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const message = `${timestamp}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify an inbound webhook signature (for testing / partner reference)
 */
export async function verifyWebhookSignature(
  body: string,
  secret: string,
  timestamp: number,
  signature: string,
  maxAgeSeconds = 300
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxAgeSeconds) {
    return false; // Replay protection
  }

  const expected = await signWebhookPayload(body, secret, timestamp);

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
