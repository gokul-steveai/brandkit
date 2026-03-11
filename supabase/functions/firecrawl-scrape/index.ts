import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

// ========== TOKEN COSTS ==========
const TOKEN_COST = 1; // firecrawl-scrape costs 1 token

// ========== RATE LIMITING ==========
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

interface TokenResult {
  allowed: boolean;
  tokensRemaining: number;
  message?: string;
}

async function checkRateLimit(
  supabase: any,
  userId: string,
  functionName: string
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .single();

  if (!existing) {
    await supabase.from('rate_limits').insert({
      user_id: userId,
      function_name: functionName,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS) };
  }

  const recordWindowStart = new Date(existing.window_start);

  if (recordWindowStart < windowStart) {
    await supabase
      .from('rate_limits')
      .update({ request_count: 1, window_start: now.toISOString() })
      .eq('id', existing.id);
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS) };
  }

  if (existing.request_count >= RATE_LIMIT_MAX) {
    const resetAt = new Date(recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MS);
    return { allowed: false, remaining: 0, resetAt };
  }

  await supabase
    .from('rate_limits')
    .update({ request_count: existing.request_count + 1 })
    .eq('id', existing.id);

  const resetAt = new Date(recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MS);
  return { allowed: true, remaining: RATE_LIMIT_MAX - existing.request_count - 1, resetAt };
}

// Check and deduct tokens with 10% overage allowance
async function checkAndDeductTokens(
  supabase: any,
  userId: string,
  tokenCost: number,
  functionName: string,
  brandKitId?: string
): Promise<TokenResult> {
  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !subscription) {
    // Create default subscription for user if none exists
    const { data: newSub, error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        subscription_tier: 'free',
        tokens_balance: 10,
        monthly_token_allowance: 10,
      })
      .select()
      .single();

    if (createError) {
      return { allowed: false, tokensRemaining: 0, message: 'Failed to create subscription' };
    }

    // Use newly created subscription
    return checkAndDeductTokens(supabase, userId, tokenCost, functionName, brandKitId);
  }

  // Calculate max allowed with 10% overage
  const maxOverage = Math.floor(subscription.monthly_token_allowance * (subscription.overage_limit_percent / 100));
  const minBalance = -maxOverage;

  // Check if user has enough tokens (including overage)
  if (subscription.tokens_balance - tokenCost < minBalance) {
    return {
      allowed: false,
      tokensRemaining: subscription.tokens_balance,
      message: `Insufficient tokens. Balance: ${subscription.tokens_balance}, Required: ${tokenCost}. Upgrade your plan for more tokens.`
    };
  }

  // Deduct tokens
  const newBalance = subscription.tokens_balance - tokenCost;
  const newUsed = subscription.tokens_used_this_period + tokenCost;

  await supabase
    .from('user_subscriptions')
    .update({
      tokens_balance: newBalance,
      tokens_used_this_period: newUsed,
    })
    .eq('user_id', userId);

  // Log the transaction
  await supabase.from('token_transactions').insert({
    user_id: userId,
    transaction_type: 'api_usage',
    tokens_amount: -tokenCost,
    tokens_balance_after: newBalance,
    description: `API call: ${functionName}`,
    function_name: functionName,
    brand_kit_id: brandKitId || null,
    metadata: { function: functionName, cost: tokenCost },
  });

  return { allowed: true, tokensRemaining: newBalance };
}

// ========== INPUT VALIDATION HELPERS ==========

const MAX_URL_LENGTH = 2048;
const MAX_STRING_LENGTH = 10000;

function sanitizeString(input: unknown, maxLength = MAX_STRING_LENGTH): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  return input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLength);
}

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function validateScrapeOptions(options: unknown): Record<string, unknown> | null {
  if (!options || typeof options !== 'object') return null;
  const opts = options as Record<string, unknown>;
  const validFormats = ['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'branding', 'summary'];

  const sanitized: Record<string, unknown> = {};

  if (Array.isArray(opts.formats)) {
    sanitized.formats = opts.formats
      .filter(f => typeof f === 'string' && validFormats.includes(f))
      .slice(0, 10);
  }

  if (typeof opts.onlyMainContent === 'boolean') {
    sanitized.onlyMainContent = opts.onlyMainContent;
  }

  if (typeof opts.waitFor === 'number' && opts.waitFor >= 0 && opts.waitFor <= 30000) {
    sanitized.waitFor = opts.waitFor;
  }

  return sanitized;
}

async function verifyBrandKitOwnership(
  supabase: any,
  brandKitId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("brand_kits")
    .select("user_id")
    .eq("id", brandKitId)
    .single();

  if (error || !data) return false;
  return data.user_id === userId;
}

function isValidUrl(urlString: string): boolean {
  if (urlString.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^\[fc00:/,
      /^\[fe80:/,
    ];
    return !blockedPatterns.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(origin);
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    const rawUrl = sanitizeString(body.url, MAX_URL_LENGTH);
    if (!rawUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const options = validateScrapeOptions(body.options);
    const brandKitId = body.brandKitId;

    let formattedUrl = rawUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (!isValidUrl(formattedUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or blocked URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const rateLimit = await checkRateLimit(supabase, user.id, 'firecrawl-scrape');
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded",
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          }
        }
      );
    }

    // Check and deduct tokens
    const tokenResult = await checkAndDeductTokens(supabase, user.id, TOKEN_COST, 'firecrawl-scrape', brandKitId);
    if (!tokenResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: tokenResult.message || "Insufficient tokens",
          tokensRemaining: tokenResult.tokensRemaining,
        }),
        {
          status: 402,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Tokens-Remaining": String(tokenResult.tokensRemaining),
          }
        }
      );
    }

    // Verify brand kit ownership if provided
    if (brandKitId) {
      if (!isValidUUID(brandKitId)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid brand kit ID format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isOwner = await verifyBrandKitOwnership(supabase, brandKitId, user.id);
      if (!isOwner) {
        return new Response(
          JSON.stringify({ success: false, error: "Not authorized to access this brand kit" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`User ${user.id} scraping URL: ${formattedUrl}, tokens remaining: ${tokenResult.tokensRemaining}`);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formats = options?.formats || ['branding', 'summary'];

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: formats,
        onlyMainContent: options?.onlyMainContent ?? true,
        waitFor: options?.waitFor,
        location: options?.location,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save raw scrape data if brandKitId provided
    let rawScrapePath = null;
    if (brandKitId) {
      try {
        // SECURITY: Use random UUID instead of predictable timestamp
        const randomId = crypto.randomUUID();
        const fileName = `${brandKitId}/${randomId}-scrape.json`;

        const { error: uploadError } = await supabase.storage
          .from('firecrawl-scrapes')
          .upload(fileName, JSON.stringify(data, null, 2), {
            contentType: 'application/json',
            upsert: false
          });

        if (!uploadError) {
          rawScrapePath = fileName;
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
      }
    }

    return new Response(
      JSON.stringify({ ...data, rawScrapePath, tokensRemaining: tokenResult.tokensRemaining }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Tokens-Remaining': String(tokenResult.tokensRemaining),
        }
      }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
