import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== TOKEN COSTS ==========
const TOKEN_COST = 1; // fill-brand-gaps costs 1 token

// ========== RATE LIMITING ==========
const RATE_LIMIT_MAX = 20;
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
    const { error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        subscription_tier: 'free',
        tokens_balance: 10,
        monthly_token_allowance: 10,
      });
    
    if (createError) {
      return { allowed: false, tokensRemaining: 0, message: 'Failed to create subscription' };
    }
    
    return checkAndDeductTokens(supabase, userId, tokenCost, functionName, brandKitId);
  }

  const maxOverage = Math.floor(subscription.monthly_token_allowance * (subscription.overage_limit_percent / 100));
  const minBalance = -maxOverage;

  if (subscription.tokens_balance - tokenCost < minBalance) {
    return { 
      allowed: false, 
      tokensRemaining: subscription.tokens_balance,
      message: `Insufficient tokens. Balance: ${subscription.tokens_balance}. Upgrade your plan.`
    };
  }

  const newBalance = subscription.tokens_balance - tokenCost;
  const newUsed = subscription.tokens_used_this_period + tokenCost;

  await supabase
    .from('user_subscriptions')
    .update({ tokens_balance: newBalance, tokens_used_this_period: newUsed })
    .eq('user_id', userId);

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

// ========== INPUT VALIDATION ==========

const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 50;
const VALID_SECTIONS = ['core', 'personality', 'expression', 'governance'];

function sanitizeString(input: unknown, maxLength = MAX_STRING_LENGTH): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  return input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLength);
}

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function validateSectionsToFill(sections: unknown): string[] {
  if (!Array.isArray(sections)) return [];
  return sections.filter(s => typeof s === 'string' && VALID_SECTIONS.includes(s)).slice(0, MAX_ARRAY_LENGTH);
}

function sanitizeUserAnswers(answers: unknown): Record<string, string> {
  if (!answers || typeof answers !== 'object') return {};
  const sanitized: Record<string, string> = {};
  const validFieldPattern = /^[a-z_]+\.[a-z_]+$/;
  
  for (const [key, value] of Object.entries(answers)) {
    if (validFieldPattern.test(key) && typeof value === 'string') {
      const sanitizedValue = sanitizeString(value, MAX_STRING_LENGTH);
      if (sanitizedValue) sanitized[key] = sanitizedValue;
    }
  }
  return sanitized;
}

async function verifyBrandKitOwnership(supabase: any, brandKitId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("brand_kits").select("user_id").eq("id", brandKitId).single();
  if (error || !data) return false;
  return data.user_id === userId;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const brandKitId = body.brandKitId;
    const sectionsToFill = validateSectionsToFill(body.sectionsToFill);
    const userAnswers = sanitizeUserAnswers(body.userAnswers);

    if (!isValidUUID(brandKitId)) {
      return new Response(JSON.stringify({ error: "Invalid brand kit ID format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const isOwner = await verifyBrandKitOwnership(supabase, brandKitId, user.id);
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Not authorized to access this brand kit" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(supabase, user.id, 'fill-brand-gaps');
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfter }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } });
    }

    // Check and deduct tokens
    const tokenResult = await checkAndDeductTokens(supabase, user.id, TOKEN_COST, 'fill-brand-gaps', brandKitId);
    if (!tokenResult.allowed) {
      return new Response(JSON.stringify({ error: tokenResult.message || "Insufficient tokens", tokensRemaining: tokenResult.tokensRemaining }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`User ${user.id} filling gaps, tokens remaining: ${tokenResult.tokensRemaining}`);

    const { data: brandKit } = await supabase.from('brand_kits').select('*').eq('id', brandKitId).single();
    if (!brandKit) throw new Error('Brand kit not found');

    const filledData: Record<string, any> = {};

    if (userAnswers && Object.keys(userAnswers).length > 0) {
      for (const [questionId, answer] of Object.entries(userAnswers)) {
        const [sectionId, field] = questionId.split('.');
        if (!filledData[sectionId]) filledData[sectionId] = {};
        filledData[sectionId][field] = answer;
      }
    } else {
      const prompt = `You are a brand strategist. Based on the following brand information, generate content for the missing sections.

Brand Name: ${brandKit.name}
Tagline: ${brandKit.tagline || 'Not set'}
Description: ${brandKit.description || 'Not set'}

Generate content for these sections: ${sectionsToFill.join(', ')}

Return a JSON object with the following structure:
{
  "core": { "mission": "...", "vision": "...", "brand_story": "..." },
  "personality": { "brand_values": [...], "personality_traits": [...] },
  "expression": { "tone_of_voice": {...}, "verbal_style": {...} }
}

Only include sections that were requested.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: 'You are a brand strategist. Return only valid JSON.' }, { role: 'user', content: prompt }],
        }),
      });

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '{}';
      
      try {
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        Object.assign(filledData, JSON.parse(cleanedContent));
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const updatePromises = [];
    if (filledData.core) updatePromises.push(supabase.from('brand_kit_core').upsert({ brand_kit_id: brandKitId, ...filledData.core }, { onConflict: 'brand_kit_id' }));
    if (filledData.personality) updatePromises.push(supabase.from('brand_kit_personality').upsert({ brand_kit_id: brandKitId, ...filledData.personality }, { onConflict: 'brand_kit_id' }));
    if (filledData.expression) updatePromises.push(supabase.from('brand_kit_expression').upsert({ brand_kit_id: brandKitId, ...filledData.expression }, { onConflict: 'brand_kit_id' }));
    await Promise.all(updatePromises);

    return new Response(JSON.stringify({ filledData, success: true, tokensRemaining: tokenResult.tokensRemaining }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Tokens-Remaining': String(tokenResult.tokensRemaining) },
    });
  } catch (error: unknown) {
    console.error('Error in fill-brand-gaps:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
