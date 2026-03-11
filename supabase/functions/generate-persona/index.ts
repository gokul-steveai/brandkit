import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { checkRateLimit, checkAndDeductTokens } from "../_shared/rate-limit.ts";

// ========== TOKEN COSTS ==========
const TOKEN_COST = 1; // generate-persona costs 1 token

// ========== INPUT VALIDATION HELPERS ==========

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

function sanitizeString(input: unknown, maxLength: number): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  return input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLength);
}

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    const brandKitId = body.brandKitId;
    const name = sanitizeString(body.name, MAX_NAME_LENGTH);
    const purposeType = sanitizeString(body.purposeType, 50);
    const description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
    
    // Extract new archetype and context fields
    const baseArchetypeId = body.baseArchetypeId || null;
    const baseArchetypeName = sanitizeString(body.baseArchetypeName, 200);
    const baseArchetypeTraits: string[] = Array.isArray(body.baseArchetypeTraits) ? body.baseArchetypeTraits : [];
    const baseArchetypeLlmInstruction = sanitizeString(body.baseArchetypeLlmInstruction, 2000);
    const targetAudienceContext = sanitizeString(body.targetAudienceContext, 500);
    const interactionContext = sanitizeString(body.interactionContext, 100);

    if (!isValidUUID(brandKitId)) {
      return new Response(
        JSON.stringify({ error: "Invalid brand kit ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Persona name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!purposeType) {
      return new Response(
        JSON.stringify({ error: "Purpose type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const isOwner = await verifyBrandKitOwnership(supabase, brandKitId, user.id);
    if (!isOwner) {
      return new Response(
        JSON.stringify({ error: "Not authorized to access this brand kit" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit (20 requests per hour)
    const rateLimit = await checkRateLimit(supabase, user.id, 'generate-persona', 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } }
      );
    }

    // Check and deduct tokens
    const tokenResult = await checkAndDeductTokens(supabase, user.id, TOKEN_COST, 'generate-persona', brandKitId);
    if (!tokenResult.allowed) {
      return new Response(
        JSON.stringify({ error: tokenResult.message || "Insufficient tokens", tokensRemaining: tokenResult.tokensRemaining }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Tokens-Remaining": String(tokenResult.tokensRemaining) } }
      );
    }

    console.log(`User ${user.id} generating persona, tokens remaining: ${tokenResult.tokensRemaining}`);

    // Fetch brand kit data for context
    const { data: brandKit } = await supabase.from("brand_kits").select("*").eq("id", brandKitId).single();
    const { data: personality } = await supabase.from("brand_kit_personality").select("*").eq("brand_kit_id", brandKitId).single();
    const { data: expression } = await supabase.from("brand_kit_expression").select("*").eq("brand_kit_id", brandKitId).single();
    const { data: governance } = await supabase.from("brand_kit_governance").select("*").eq("brand_kit_id", brandKitId).single();
    const { data: core } = await supabase.from("brand_kit_core").select("*").eq("brand_kit_id", brandKitId).single();

    const systemPrompt = `You are an expert AI persona architect. Your task is to create detailed AI persona configurations in XML format.
The persona should be comprehensive, professional, and aligned with the brand's identity.
Always respond with valid XML wrapped in <system_instruction> tags.`;

    // Build archetype context section if provided
    const archetypeContext = baseArchetypeName 
      ? `\n**Base Archetype:** ${baseArchetypeName}
- Key Traits: ${baseArchetypeTraits.join(', ') || 'Not specified'}
- LLM Instruction: ${baseArchetypeLlmInstruction || 'Not specified'}`
      : '';

    // Build audience and interaction context
    const audienceSection = targetAudienceContext 
      ? `\n**Target Audience:** ${targetAudienceContext}` 
      : '';
    const interactionSection = interactionContext 
      ? `\n**Interaction Context:** ${interactionContext}` 
      : '';

    const userPrompt = `Create an AI persona with the following specifications:

**Persona Name:** ${name}
**Purpose Type:** ${purposeType}
${description ? `**Additional Description:** ${description}` : ''}${archetypeContext}${audienceSection}${interactionSection}

**Brand Context:**
- Brand Name: ${brandKit?.name || 'Unknown'}
- Tagline: ${brandKit?.tagline || 'Not specified'}
- Description: ${brandKit?.description || 'Not specified'}
- Mission: ${core?.mission || 'Not specified'}
- Vision: ${core?.vision || 'Not specified'}

**Personality Traits:** ${JSON.stringify(personality?.personality_traits || [])}
**Brand Values:** ${JSON.stringify(personality?.brand_values || [])}
**Tone of Voice:** ${JSON.stringify(expression?.tone_of_voice || {})}
**Behavioral Constraints:** ${JSON.stringify(governance?.behavioral_constraints || [])}

Generate a complete XML persona configuration with identity, voice_profile, capabilities, and behavioral_rules sections.${baseArchetypeName ? ` Use the base archetype's traits and LLM instruction as a foundation for the persona's voice and behavior.` : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedXml = aiResponse.choices?.[0]?.message?.content || "";

    const extractField = (xml: string, tag: string): string | null => {
      const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : null;
    };

    const extractedRole = extractField(generatedXml, "role");
    const extractedDirective = extractField(generatedXml, "prime_directive");

    const tasksMatch = generatedXml.match(/<primary_tasks>([\s\S]*?)<\/primary_tasks>/);
    const tasks: string[] = [];
    if (tasksMatch) {
      const taskMatches = tasksMatch[1].match(/<task>([^<]+)<\/task>/g);
      if (taskMatches) {
        taskMatches.forEach((t: string) => {
          const taskContent = t.replace(/<\/?task>/g, "").trim();
          if (taskContent) tasks.push(taskContent);
        });
      }
    }

    const behavioralRules: string[] = [];
    const constraintsMatch = generatedXml.match(/<constraints>([\s\S]*?)<\/constraints>/);
    if (constraintsMatch) {
      const ruleMatches = constraintsMatch[1].match(/<constraint>([^<]+)<\/constraint>/g);
      if (ruleMatches) {
        ruleMatches.forEach((r: string) => {
          const rule = r.replace(/<\/?constraint>/g, "").trim();
          if (rule) behavioralRules.push(rule);
        });
      }
    }

    return new Response(
      JSON.stringify({
        xml: generatedXml,
        parsed: {
          name,
          purposeType,
          role: extractedRole,
          primeDirective: extractedDirective,
          tasks,
          behavioralRules,
        },
        tokensRemaining: tokenResult.tokensRemaining,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          'X-Tokens-Remaining': String(tokenResult.tokensRemaining),
        }
      }
    );
  } catch (error) {
    console.error("Error generating persona:", error);
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
