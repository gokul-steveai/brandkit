import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== TOKEN COSTS ==========
const TOKEN_COST = 0; // generate-gap-questions is FREE

// ========== RATE LIMITING ==========
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
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

// ========== INPUT VALIDATION ==========

const MAX_ARRAY_LENGTH = 50;
const VALID_FIELDS = [
  'core.mission', 'core.vision', 'core.brand_story', 'core.brand_promises',
  'personality.brand_values', 'personality.personality_traits', 'personality.brand_moods', 'personality.brand_principles',
  'expression.tone_of_voice', 'expression.verbal_style', 'expression.preferred_terminology',
  'governance.usage_guidelines', 'governance.behavioral_constraints'
];

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function validateMissingFields(fields: unknown): string[] {
  if (!Array.isArray(fields)) return [];
  return fields.filter(f => typeof f === 'string' && VALID_FIELDS.includes(f)).slice(0, MAX_ARRAY_LENGTH);
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
    const missingFields = validateMissingFields(body.missingFields);

    if (!isValidUUID(brandKitId)) {
      return new Response(JSON.stringify({ error: "Invalid brand kit ID format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    // Check rate limit (this function is free, no token deduction)
    const rateLimit = await checkRateLimit(supabase, user.id, 'generate-gap-questions');
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfter }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } });
    }

    console.log(`User ${user.id} generating gap questions (free operation)`);

    const { data: brandKit } = await supabase.from('brand_kits').select('*').eq('id', brandKitId).single();

    const fieldQuestions: Record<string, { question: string; placeholder: string }> = {
      'core.mission': {
        question: `What is ${brandKit?.name || 'your brand'}'s mission? What problem do you solve?`,
        placeholder: 'e.g., To empower small businesses with affordable marketing tools...',
      },
      'core.vision': {
        question: 'What is your vision for the future? Where do you want to be in 5-10 years?',
        placeholder: 'e.g., A world where every business can compete on equal footing...',
      },
      'core.brand_story': {
        question: 'Tell us your brand story. How did it start and why?',
        placeholder: 'e.g., Founded in 2020, we started when...',
      },
      'personality.brand_values': {
        question: 'What are your core values? What principles guide your decisions?',
        placeholder: 'e.g., Innovation, Transparency, Customer-first...',
      },
      'expression.tone_of_voice': {
        question: 'How would you describe your brand voice? Formal, casual, playful?',
        placeholder: 'e.g., Professional but approachable, with a touch of humor...',
      },
    };

    const questions = missingFields.map((field: string) => {
      const config = fieldQuestions[field] || {
        question: `Please provide information for: ${field.split('.')[1]}`,
        placeholder: 'Enter your response...',
      };
      
      return {
        id: field,
        sectionId: field.split('.')[0],
        field: field.split('.')[1],
        question: config.question,
        type: 'textarea',
        placeholder: config.placeholder,
      };
    });

    return new Response(JSON.stringify({ questions, tokenCost: TOKEN_COST }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-gap-questions:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
