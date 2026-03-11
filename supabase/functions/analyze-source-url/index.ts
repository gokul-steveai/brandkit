import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Rate limit: 5 requests per 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ========== Types ==========

interface RateLimitRecord {
  id: string;
  user_id: string;
  function_name: string;
  request_count: number;
  window_start: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = ReturnType<typeof createClient<any>>;

// ========== URL Validation ==========

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow http/https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    
    const hostname = url.hostname.toLowerCase();
    
    // Block private IPs and local addresses (SSRF prevention)
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^\[fc00:/i,
      /^\[fd00:/i,
      /^\[fe80:/i,
    ];
    
    return !blockedPatterns.some((p) => p.test(hostname));
  } catch {
    return false;
  }
}

// ========== Rate Limiting ==========

async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: string
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .single();

  const record = existing as RateLimitRecord | null;

  if (!record) {
    // First request - create record
    await supabase.from("rate_limits").insert({
      user_id: userId,
      function_name: functionName,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    };
  }

  const recordWindowStart = new Date(record.window_start);

  // Window has expired - reset
  if (recordWindowStart < windowStart) {
    await supabase
      .from("rate_limits")
      .update({ request_count: 1, window_start: now.toISOString() })
      .eq("id", record.id);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    };
  }

  // Check if limit exceeded
  if (record.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetAt = new Date(recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MS);
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment counter
  await supabase
    .from("rate_limits")
    .update({ request_count: record.request_count + 1 })
    .eq("id", record.id);

  const resetAt = new Date(recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MS);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.request_count - 1,
    resetAt,
  };
}

// ========== Main Handler ==========

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    // ========== Authentication ==========
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    // ========== Rate Limiting ==========
    const rateLimit = await checkRateLimit(supabaseAuth, user.id, "analyze-source-url");
    
    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      console.log("Rate limit exceeded for user:", user.id, "Retry after:", retryAfterSeconds);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Maximum 5 requests per 15 minutes.",
          retryAfter: retryAfterSeconds,
          resetAt: rateLimit.resetAt.toISOString()
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds)
          } 
        }
      );
    }

    console.log("Rate limit check passed. Remaining:", rateLimit.remaining);

    // ========== Input Validation ==========
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format and block private IPs
    if (!isValidUrl(url)) {
      console.error("Invalid URL rejected:", url);
      return new Response(
        JSON.stringify({ error: "Invalid URL. Only public http/https URLs are allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing URL:", url);

    // ========== Firecrawl API Call ==========
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      console.error("Firecrawl API key not configured");
      return new Response(
        JSON.stringify({ description: null, favicon: null, socialLinks: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeResponse.status);
      return new Response(
        JSON.stringify({ description: null, favicon: null, socialLinks: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const metadata = scrapeData.data?.metadata || {};

    const favicon = metadata.favicon || metadata.ogImage || null;
    const description = metadata.description || metadata.ogDescription || "";

    console.log("Extracted:", { favicon, description: description?.slice(0, 50) });

    return new Response(
      JSON.stringify({ 
        description, 
        favicon, 
        socialLinks: {},
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt.toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
