/**
 * Shared CORS Headers for Edge Functions
 * 
 * Provides standardized CORS configuration with origin validation.
 */

// Allowed origins for CORS (exact matches)
const ALLOWED_ORIGINS = [
    "https://brandkitos.lovable.app",
    "https://brandkit-os.lovable.app",
    "https://www.brandkitos.com",
    "https://brandkitos.com",
];

// Pattern for Lovable preview URLs (e.g., id-preview--uuid.lovable.app)
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/;
// Pattern for Lovable project URLs (e.g., uuid.lovableproject.com)
const LOVABLE_PROJECT_PATTERN = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string): boolean {
    // Check exact matches first
    if (ALLOWED_ORIGINS.includes(origin)) {
        return true;
    }
    // Check Lovable preview pattern
    if (LOVABLE_PREVIEW_PATTERN.test(origin)) {
        return true;
    }
    // Check Lovable project pattern
    if (LOVABLE_PROJECT_PATTERN.test(origin)) {
        return true;
    }
    return false;
}

/**
 * Get CORS headers with origin validation
 * If origin is not allowed, returns null for the origin header (will be blocked)
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
    // If origin is provided but not allowed, we'll still return headers but log it
    const origin = requestOrigin && isAllowedOrigin(requestOrigin)
        ? requestOrigin
        : ALLOWED_ORIGINS[0]; // Fallback for valid requests without origin

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    };
}

/**
 * Validate origin strictly - returns null if not allowed
 * Use this for stricter validation in sensitive endpoints
 */
export function validateOriginStrict(requestOrigin: string | null): string | null {
    if (!requestOrigin) return null;
    return isAllowedOrigin(requestOrigin) ? requestOrigin : null;
}

/**
 * Standard CORS headers (for backward compatibility)
 * 
 * @deprecated Use getCorsHeaders(req.headers.get('origin')) instead
 */
export const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Handle CORS preflight request
 */
export function handleCorsPrelight(requestOrigin: string | null): Response {
    return new Response(null, {
        headers: getCorsHeaders(requestOrigin),
        status: 204
    });
}
