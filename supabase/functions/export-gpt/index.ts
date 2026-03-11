import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { validateJWT, verifyBrandKitAccess, isValidUUID } from "../_shared/auth.ts";
import { checkRateLimit, checkAndDeductTokens } from "../_shared/rate-limit.ts";

// ========== TOKEN SYSTEM ==========
// Shared functions imported from ../_shared/

// ========== INPUT VALIDATION HELPERS ==========

const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 50;
const VALID_SECTIONS = ['basics', 'core', 'personality', 'expression', 'products', 'audience', 'governance'];
const VALID_RESTRICTIONS = ['no_competitors', 'no_pricing', 'no_promises', 'no_sensitive', 'no_jargon', 'no_humor'];
const VALID_VISUAL_IDENTITY_MODES = ['full', 'core_colors_only', 'none'];

// Sanitize string input
function sanitizeString(input: unknown, maxLength = MAX_STRING_LENGTH): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  return input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, maxLength);
}

// Validate and sanitize export config
function validateExportConfig(config: unknown): Record<string, unknown> {
  const defaultConfig = {
    selectedSections: ['basics', 'core', 'personality', 'expression'],
    selectedPersonaId: null,
    gapFillingMode: 'skip',
    gapsToFill: [],
    restrictions: [],
    restrictionsCustom: '',
    visualIdentityMode: 'full',
  };

  if (!config || typeof config !== 'object') return defaultConfig;
  const cfg = config as Record<string, unknown>;

  return {
    selectedSections: Array.isArray(cfg.selectedSections)
      ? cfg.selectedSections.filter(s => typeof s === 'string' && VALID_SECTIONS.includes(s)).slice(0, MAX_ARRAY_LENGTH)
      : defaultConfig.selectedSections,
    selectedPersonaId: isValidUUID(cfg.selectedPersonaId) ? cfg.selectedPersonaId : null,
    gapFillingMode: ['skip', 'ai_auto', 'manual'].includes(cfg.gapFillingMode as string)
      ? cfg.gapFillingMode
      : 'skip',
    gapsToFill: Array.isArray(cfg.gapsToFill)
      ? cfg.gapsToFill.filter(g => typeof g === 'string').slice(0, MAX_ARRAY_LENGTH)
      : [],
    restrictions: Array.isArray(cfg.restrictions)
      ? cfg.restrictions.filter(r => typeof r === 'string' && VALID_RESTRICTIONS.includes(r))
      : [],
    restrictionsCustom: sanitizeString(cfg.restrictionsCustom, 1000) || '',
    visualIdentityMode: VALID_VISUAL_IDENTITY_MODES.includes(cfg.visualIdentityMode as string)
      ? cfg.visualIdentityMode
      : 'full',
  };
}

// ========== END VALIDATION HELPERS ==========

// Helper functions to ensure consistent JSON key ordering
function orderBrandMood(mood: any) {
  if (!mood) return null;
  return {
    name: mood.name ?? null,
    emotional_description: mood.emotional_description ?? null,
    visual_descriptor: mood.visual_descriptor ?? null,
    associated_tone: mood.associated_tone ?? null,
  };
}

function orderBrandValue(value: any) {
  if (!value) return null;
  return {
    name: value.name ?? null,
    description: value.description ?? null,
  };
}

function orderPersonalityTrait(trait: any) {
  if (!trait) return null;
  return {
    title: trait.title ?? null,
    description: trait.description ?? null,
  };
}

function orderBrandPrinciple(principle: any) {
  if (!principle) return null;
  return {
    name: principle.name ?? null,
    action: principle.action ?? null,
    use_case: principle.use_case ?? null,
  };
}

function orderTerminology(item: any) {
  if (!item) return null;
  return {
    term: item.term ?? null,
    instead_of: item.instead_of ?? [],
    description: item.description ?? null,
  };
}

// Shared functions imported from ../_shared/

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(origin);
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { user, valid, error: authError } = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);
    if (!valid || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const brandKitId = body.brandKitId;

    // Validate and sanitize config
    const config = validateExportConfig(body.config);

    // Validate brandKitId is a valid UUID
    if (!isValidUUID(brandKitId)) {
      return new Response(
        JSON.stringify({ error: "Invalid brand kit ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Export GPT request:', { brandKitId, selectedPersonaId: config.selectedPersonaId });

    // Create service client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const TOKEN_COST = 1;
    const RATE_LIMIT_MAX = 50;
    const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

    const rateLimit = await checkRateLimit(supabase, user.id, 'export-gpt', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter,
          limit: RATE_LIMIT_MAX,
          resetAt: rateLimit.resetAt.toISOString()
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt.getTime() / 1000))
          }
        }
      );
    }

    // Check and deduct tokens
    const tokenResult = await checkAndDeductTokens(supabase, user.id, TOKEN_COST, 'export-gpt', brandKitId);
    if (!tokenResult.allowed) {
      return new Response(
        JSON.stringify({
          error: tokenResult.message || "Insufficient tokens",
          tokensRemaining: tokenResult.tokensRemaining,
          required: TOKEN_COST,
          message: "Please upgrade your plan or wait for your token balance to refresh."
        }),
        {
          status: 402,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Tokens-Remaining": String(tokenResult.tokensRemaining),
            "X-Tokens-Required": String(TOKEN_COST)
          }
        }
      );
    }

    // Verify brand kit ownership
    const { isMember } = await verifyBrandKitAccess(supabase, brandKitId, user.id);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: "Not authorized to access this brand kit" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authorized: User ${user.id} exporting brand kit ${brandKitId}, tokens remaining: ${tokenResult.tokensRemaining}`);

    // Fetch all brand kit data
    const [
      { data: brandKit },
      { data: core },
      { data: personality },
      { data: expression },
      { data: governance },
      { data: products },
      { data: audience },
    ] = await Promise.all([
      supabase.from('brand_kits').select('*').eq('id', brandKitId).single(),
      supabase.from('brand_kit_core').select('*').eq('brand_kit_id', brandKitId).single(),
      supabase.from('brand_kit_personality').select('*').eq('brand_kit_id', brandKitId).single(),
      supabase.from('brand_kit_expression').select('*').eq('brand_kit_id', brandKitId).single(),
      supabase.from('brand_kit_governance').select('*').eq('brand_kit_id', brandKitId).single(),
      supabase.from('brand_kit_products').select('*').eq('brand_kit_id', brandKitId),
      supabase.from('brand_kit_target_audience').select('*').eq('brand_kit_id', brandKitId),
    ]);

    if (!brandKit) {
      throw new Error('Brand kit not found');
    }

    // Fetch selected persona if any
    let persona = null;
    if (config.selectedPersonaId) {
      // Try brand kit persona first
      const { data: bkPersona } = await supabase
        .from('brand_kit_personas')
        .select('*')
        .eq('id', config.selectedPersonaId)
        .single();

      if (bkPersona) {
        persona = bkPersona;
      } else {
        // Try library persona
        const { data: libPersona } = await supabase
          .from('library_personas')
          .select('*')
          .eq('id', config.selectedPersonaId)
          .single();

        if (libPersona) {
          // Convert library template to persona format
          persona = {
            name: libPersona.name,
            purpose_type: libPersona.purpose_type,
            role_definition: libPersona.role_definition_template,
            function_description: libPersona.function_description_template,
            personality_description: libPersona.personality_description_template,
            tasks: libPersona.tasks,
            behavioral_rules: libPersona.behavioral_rules,
            tone_overrides: libPersona.tone_defaults,
          };
        }
      }
    }

    console.log('Fetched persona:', persona?.name || 'None');

    // Fetch knowledge files for recommendations
    const { data: knowledgeFiles } = await supabase
      .from('library_knowledge_files')
      .select('*')
      .eq('is_library', true);

    // Fetch knowledge files for anchor references
    const [{ data: userKnowledgeFiles }, { data: brandKitKnowledgeFiles }] = await Promise.all([
      supabase.from('library_knowledge_files').select('display_name, reference_name, description')
        .eq('user_id', brandKit.user_id),
      supabase.from('brand_kit_knowledge_files').select('custom_reference_name, library_file_id, library_knowledge_files(display_name, reference_name, description)')
        .eq('brand_kit_id', brandKitId),
    ]);

    // Build system instructions with persona merged inline
    const systemInstructions = generateSystemInstructions(
      brandKit, core, personality, expression, governance,
      products || [], audience || [], config, persona,
      userKnowledgeFiles || [], brandKitKnowledgeFiles || []
    );
    const userPromptTemplate = '';

    // Build recommended knowledge files
    const recommendedKnowledgeFiles = (knowledgeFiles || []).map((f: any) => ({
      referenceName: f.reference_name,
      displayName: f.display_name,
      description: f.description || '',
      fileType: f.file_type,
      systemInstructionHint: f.system_instruction_hint || '',
    }));

    // Build knowledge file with properly ordered JSON keys
    const orderedPersonality = personality ? {
      ...personality,
      brand_moods: Array.isArray(personality.brand_moods)
        ? personality.brand_moods.map(orderBrandMood)
        : personality.brand_moods,
      brand_values: Array.isArray(personality.brand_values)
        ? personality.brand_values.map(orderBrandValue)
        : personality.brand_values,
      personality_traits: Array.isArray(personality.personality_traits)
        ? personality.personality_traits.map(orderPersonalityTrait)
        : personality.personality_traits,
      brand_principles: Array.isArray(personality.brand_principles)
        ? personality.brand_principles.map(orderBrandPrinciple)
        : personality.brand_principles,
    } : null;

    const orderedExpression = expression ? {
      ...expression,
      preferred_terminology: Array.isArray(expression.preferred_terminology)
        ? expression.preferred_terminology.map(orderTerminology)
        : expression.preferred_terminology,
    } : null;

    const knowledgeFile = {
      brand: brandKit,
      core,
      personality: orderedPersonality,
      expression: orderedExpression,
      governance,
      products,
      audience,
      visualIdentity: config.visualIdentityMode !== 'none'
        ? generateVisualIdentityKnowledge(brandKit, config.visualIdentityMode as string)
        : null,
      exportedAt: new Date().toISOString(),
    };

    // Generate conversation starters based on persona
    const conversationStarters = generateConversationStarters(brandKit, persona);

    const result = {
      systemInstructions,
      userPromptTemplate,
      knowledgeFile,
      recommendedKnowledgeFiles,
      conversationStarters,
      metadata: {
        title: `${brandKit.name} Custom GPT`,
        description: `System instructions for ${brandKit.name} brand assistant`,
        referenceName: `${brandKit.name.toLowerCase().replace(/\s+/g, '-')}-gpt`,
        exportType: 'chatgpt_custom_gpt',
        exportFormat: 'markdown',
        sectionsIncluded: config.selectedSections,
        exportConfig: config,
        gapsFilled: config.gapFillingMode === 'ai_auto' ? config.gapsToFill : [],
        metaTags: ['chatgpt', 'custom-gpt', 'brand-guidelines'],
        contentSummary: `Brand assistant for ${brandKit.name}${persona ? ` - ${persona.name}` : ''}`,
      }
    };

    console.log('Export generated successfully');

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt.getTime() / 1000)),
        'X-Tokens-Remaining': String(tokenResult.tokensRemaining)
      },
    });
  } catch (error: unknown) {
    console.error('Error in export-gpt:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== PERSONA HELPERS ==========

function stripXmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function replacePlaceholders(text: string | null | undefined, brandName: string): string {
  if (!text) return '';
  return text.replace(/\{\{brand_name\}\}/g, brandName);
}

// ========== TONE & STYLE FORMATTERS ==========

function formatToneOfVoice(tone: any): string {
  if (!tone) return 'Follow brand guidelines';
  
  let result = '';
  if (tone.description) {
    result += `${tone.description}\n\n`;
  }
  
  if (tone.attributes && Array.isArray(tone.attributes) && tone.attributes.length > 0) {
    result += '| Dimension | Level | Range |\n';
    result += '|-----------|-------|-------|\n';
    for (const attr of tone.attributes) {
      const value = attr.value ?? 50;
      const minLabel = attr.min_label || 'Low';
      const maxLabel = attr.max_label || 'High';
      result += `| ${attr.attribute || 'Unknown'} | ${value}/100 | ${minLabel} to ${maxLabel} |\n`;
    }
  }
  
  return result.trim() || 'Follow brand guidelines';
}

function formatVerbalStyle(style: any): string {
  if (!style) return 'Follow brand guidelines';
  
  const lines: string[] = [];
  if (style.vocabulary_level) lines.push(`- **Vocabulary:** ${style.vocabulary_level}`);
  if (style.punctuation_style) lines.push(`- **Punctuation:** ${style.punctuation_style}`);
  if (style.sentence_structure) lines.push(`- **Sentence Structure:** ${style.sentence_structure}`);
  
  return lines.length > 0 ? lines.join('\n') : 'Follow brand guidelines';
}

// ========== KNOWLEDGE FILE ANCHORS ==========

function generateKnowledgeSection(userFiles: any[], brandKitFiles: any[]): string {
  let section = `## Knowledge Files

Treat the uploaded Knowledge files as your authoritative source of truth.
- Always check Knowledge files first when answering questions
- If Knowledge files do not contain the answer, say: "I don't have that information in my current knowledge base."
- Then ask 1-2 targeted follow-up questions or offer a best-effort answer clearly labeled as general guidance
`;

  const anchors: string[] = [];
  
  for (const f of userFiles) {
    if (f.display_name) {
      anchors.push(`- **${f.display_name}**${f.description ? `: ${f.description}` : ''}`);
    }
  }
  
  for (const f of brandKitFiles) {
    const name = f.custom_reference_name || f.library_knowledge_files?.display_name;
    const desc = f.library_knowledge_files?.description;
    if (name) {
      anchors.push(`- **${name}**${desc ? `: ${desc}` : ''}`);
    }
  }
  
  if (anchors.length > 0) {
    section += `\n### File References\n${anchors.join('\n')}\n`;
  }

  return section;
}

// ========== MAIN SYSTEM INSTRUCTIONS GENERATOR ==========

function generateSystemInstructions(
  brandKit: any,
  core: any,
  personality: any,
  expression: any,
  governance: any,
  products: any[],
  audience: any[],
  config: any,
  persona: any,
  userKnowledgeFiles: any[],
  brandKitKnowledgeFiles: any[]
): string {
  // ===== HEADER & IDENTITY =====
  const brandName = brandKit.name;
  let instructions = '';

  if (persona) {
    const roleText = replacePlaceholders(persona.role_definition, brandName)
      || `You are a ${persona.name} for ${brandName}.`;
    const functionText = replacePlaceholders(persona.function_description, brandName)
      || 'Assist with brand-related tasks while maintaining brand consistency.';

    instructions += `# ${brandName} - ${persona.name}

## Identity & Purpose

${roleText}

**Your Function:** ${functionText}
`;

    // Add persona tasks under identity
    if (persona.tasks && Array.isArray(persona.tasks) && persona.tasks.length > 0) {
      instructions += `\n### Primary Tasks\n\n${persona.tasks.map((t: string) => `- ${t}`).join('\n')}\n`;
    }
  } else {
    instructions += `# ${brandName} Brand Assistant

## Identity & Purpose

You are ${brandName}'s official brand assistant, dedicated to maintaining brand consistency across all communications.
`;
  }

  if (brandKit.tagline) instructions += `\n**Tagline:** ${brandKit.tagline}`;
  if (brandKit.website_url) instructions += `\n**Website:** ${brandKit.website_url}`;
  instructions += '\n';

  // ===== KNOWLEDGE FILES =====
  instructions += `\n---\n\n${generateKnowledgeSection(userKnowledgeFiles, brandKitKnowledgeFiles)}\n`;

  // ===== BRAND FOUNDATION =====
  if (config.selectedSections.includes('core') && core) {
    instructions += `---

## Brand Foundation

### Our Mission
${core.mission || 'Not defined'}

### Our Vision
${core.vision || 'Not defined'}

### Our Story
${core.brand_story || 'Not defined'}
`;

    if (core.brand_promises?.length > 0) {
      instructions += `\n### Brand Promises\n${core.brand_promises.map((p: any) => `- **${p.title || p}**: ${p.description || ''}`).join('\n')}\n`;
    }
  }

  // ===== BRAND PERSONALITY =====
  if (config.selectedSections.includes('personality') && personality) {
    instructions += `\n---\n\n## Brand Personality\n`;

    if (personality.brand_values?.length > 0) {
      instructions += `\n### Core Values\n${personality.brand_values.map((v: any) => `- **${v.name || v}**: ${v.description || ''}`).join('\n')}\n`;
    }

    if (personality.personality_traits?.length > 0) {
      instructions += `\n### Personality Traits\n${personality.personality_traits.map((t: any) => `- **${t.title || t}**: ${t.description || ''}`).join('\n')}\n`;
    }

    if (personality.brand_moods?.length > 0) {
      instructions += `\n### Brand Moods\n${personality.brand_moods.map((m: any) => `- **${m.name || m}**: ${m.emotional_description || ''}`).join('\n')}\n`;
    }

    // Merge persona personality description here (stripped of XML)
    if (persona?.personality_description) {
      const cleaned = stripXmlTags(replacePlaceholders(persona.personality_description, brandName));
      if (cleaned) {
        instructions += `\n### Persona Personality\n${cleaned}\n`;
      }
    }
  }

  // ===== VOICE & EXPRESSION =====
  if (config.selectedSections.includes('expression') && expression) {
    instructions += `\n---\n\n## Voice & Expression\n`;

    instructions += `\n### Tone of Voice\n${formatToneOfVoice(expression.tone_of_voice)}\n`;
    instructions += `\n### Verbal Style\n${formatVerbalStyle(expression.verbal_style)}\n`;

    if (expression.preferred_terminology?.length > 0) {
      instructions += `\n### Preferred Terminology\n| ✅ Use | ❌ Avoid |\n|--------|----------|\n`;
      instructions += expression.preferred_terminology.map((t: any) => {
        const term = t.term || t.preferred || t.use || '';
        const avoid = t.instead_of
          ? (Array.isArray(t.instead_of) ? t.instead_of.join(', ') : t.instead_of)
          : (t.avoid || '');
        return `| ${term} | ${avoid} |`;
      }).join('\n') + '\n';
    }
  }

  // ===== PRODUCTS & SERVICES =====
  if (config.selectedSections.includes('products') && products?.length > 0) {
    instructions += `\n---\n\n## Products & Services\n\n`;
    instructions += products.map((p: any) => `### ${p.name}\n- **Type:** ${p.type || 'Not specified'}\n- **Description:** ${p.description || 'Not specified'}\n- **USP:** ${p.usp || 'Not specified'}\n${p.key_benefits?.length > 0 ? `- **Key Benefits:** ${p.key_benefits.join(', ')}` : ''}\n`).join('\n');
  }

  // ===== TARGET AUDIENCE =====
  if (config.selectedSections.includes('audience') && audience?.length > 0) {
    instructions += `\n---\n\n## Target Audience\n\n`;
    instructions += audience.map((a: any) => `### ${a.persona_name || 'Persona'}${a.is_primary ? ' (Primary)' : ''}\n- **Title:** ${a.persona_title || 'Not specified'}\n- **Demographics:** ${JSON.stringify(a.demographics) || 'Not specified'}\n- **Goals:** ${a.goals_motivations?.join(', ') || 'Not specified'}\n- **Pain Points:** ${a.frustrations_pain_points?.join(', ') || 'Not specified'}\n`).join('\n');
  }

  // ===== BEHAVIORAL RULES (merged governance + persona rules) =====
  const hasGovernance = config.selectedSections.includes('governance') && governance;
  const hasPersonaRules = persona?.behavioral_rules && Array.isArray(persona.behavioral_rules) && persona.behavioral_rules.length > 0;
  const hasRestrictions = config.restrictions?.length > 0 || config.restrictionsCustom;

  if (hasGovernance || hasPersonaRules || hasRestrictions) {
    instructions += `\n---\n\n## Behavioral Rules\n`;

    // Governance do's
    if (hasGovernance) {
      instructions += `\n### ✅ Do's\n- Always align with brand values\n- Maintain consistent tone of voice\n- Reference brand terminology\n`;

      if (governance.behavioral_constraints?.length > 0) {
        instructions += `\n### ❌ Don'ts\n${governance.behavioral_constraints.map((c: any) => `- ${c}`).join('\n')}\n`;
      }

      if (governance.negative_directory?.length > 0) {
        instructions += `\n### Avoid These Topics/Terms\n${governance.negative_directory.map((n: any) => `- ${n.term || n}: ${n.reason || ''}`).join('\n')}\n`;
      }
    }

    // Persona behavioral rules
    if (hasPersonaRules) {
      instructions += `\n### Persona-Specific Rules\n${persona.behavioral_rules.map((r: string) => `- ${r}`).join('\n')}\n`;
    }

    // User restrictions
    if (hasRestrictions) {
      const restrictionLabels: Record<string, string> = {
        no_competitors: 'Never mention competitors',
        no_pricing: 'Avoid discussing pricing details',
        no_promises: "Don't make guarantees or promises",
        no_sensitive: 'Avoid sensitive topics',
        no_jargon: 'Minimize industry jargon',
        no_humor: 'Avoid humor or jokes',
      };

      instructions += `\n### Additional Restrictions\n`;
      if (config.restrictions?.length > 0) {
        instructions += config.restrictions.map((r: string) => `- ${restrictionLabels[r] || r}`).join('\n') + '\n';
      }
      if (config.restrictionsCustom) {
        instructions += `- ${config.restrictionsCustom}\n`;
      }
    }
  }

  // ===== QUALITY ASSURANCE (single section, no duplicates) =====
  instructions += `\n---\n\n## Quality Assurance

**Before sending any response:**
1. Verify alignment with brand personality traits
2. Ensure no restricted topics are discussed
3. Confirm tone matches brand voice settings
4. Check your work before responding
`;

  return instructions;
}

function generateConversationStarters(brandKit: any, persona: any): string[] {
  if (persona) {
    const purposeStarters: Record<string, string[]> = {
      content_creation: [
        `Help me write a social media post about ${brandKit.name}`,
        'Create a tagline for our new product launch',
        'Draft an email newsletter introduction',
        'Write product descriptions in our brand voice',
      ],
      customer_support: [
        'How should I respond to a customer complaint?',
        `What are ${brandKit.name}'s core values?`,
        'Help me explain our product benefits',
        'Draft a response for a refund request',
      ],
      internal_assistant: [
        'What is our brand voice?',
        'Help me prepare for a brand presentation',
        'Review this content for brand alignment',
        'Summarize our brand guidelines',
      ],
      creative_brainstorming: [
        'Generate campaign ideas for our brand',
        'What new content formats should we try?',
        'Help me brainstorm product names',
        'Suggest ways to refresh our brand messaging',
      ],
    };

    return purposeStarters[persona.purpose_type] || [
      `Help me with a task for ${brandKit.name}`,
      'What can you help me with?',
      'Tell me about our brand',
      'Review my content for brand alignment',
    ];
  }

  return [
    `Tell me about ${brandKit.name}`,
    'What are our brand values?',
    'Help me write brand-aligned content',
    'Review my copy for brand consistency',
  ];
}

// Generate Visual Identity knowledge based on mode
function generateVisualIdentityKnowledge(brandKit: any, mode: string): Record<string, unknown> {
  const coreColors: Array<Record<string, unknown>> = [];
  const extendedColors: Array<Record<string, string>> = [];

  // Read from color_details (new unified column), fall back to flat columns
  const cd = brandKit.color_details || {};
  const hasColorDetails = Object.keys(cd).some((k: string) => cd[k]?.light?.hex);

  if (hasColorDetails) {
    const roleLabels: Record<string, string> = {
      primary: 'Primary', secondary: 'Secondary', accent: 'Accent',
      background: 'Background', text_primary: 'Text Primary',
      text_secondary: 'Text Secondary', link: 'Links',
    };

    for (const [role, data] of Object.entries(cd) as [string, any][]) {
      if (data?.light?.hex) {
        coreColors.push({
          role: data.name || roleLabels[role] || role,
          hex: data.light.hex,
          description: data.light.description || '',
          useWhen: data.light.useWhen || '',
        });
      }
    }
  } else {
    // Legacy flat column fallback
    if (brandKit.primary_color) {
      coreColors.push({ role: 'Primary', hex: brandKit.primary_color, description: 'Main brand color', useWhen: 'CTAs, buttons, links' });
    }
    if (brandKit.secondary_color) {
      coreColors.push({ role: 'Secondary', hex: brandKit.secondary_color, description: 'Supporting color', useWhen: 'Secondary buttons, backgrounds' });
    }
    if (brandKit.accent_color) {
      coreColors.push({ role: 'Accent', hex: brandKit.accent_color, description: 'Eye-catching color for emphasis', useWhen: 'Notifications, badges' });
    }
    if (brandKit.background_color) {
      coreColors.push({ role: 'Background', hex: brandKit.background_color, description: 'Base background color', useWhen: 'Page backgrounds' });
    }
    const customSlots = [
      { color: brandKit.custom_1_color, name: brandKit.custom_1_name },
      { color: brandKit.custom_2_color, name: brandKit.custom_2_name },
      { color: brandKit.custom_3_color, name: brandKit.custom_3_name },
      { color: brandKit.custom_4_color, name: brandKit.custom_4_name },
    ];
    customSlots.forEach((slot, i) => {
      if (slot.color) {
        coreColors.push({ role: slot.name || `Custom ${i + 1}`, hex: slot.color });
      }
    });
  }

  // For core_colors_only mode, return just core colors
  if (mode === 'core_colors_only') {
    return {
      type: 'core_colors_only',
      coreColors,
    };
  }

  // For full mode, also include extended colors and typography
  if (brandKit.additional_colors && Array.isArray(brandKit.additional_colors)) {
    (brandKit.additional_colors as Array<{ hex: string; name: string }>).forEach(c => {
      extendedColors.push({ hex: c.hex, name: c.name });
    });
  }

  // Typography
  const typography: Record<string, unknown> = {};

  if (brandKit.heading_font) {
    typography.heading = {
      family: brandKit.heading_font,
      sizes: brandKit.font_sizes || {},
      weights: brandKit.font_weights || {},
    };
  }

  if (brandKit.body_font) {
    typography.body = {
      family: brandKit.body_font,
    };
  }

  if (brandKit.paragraph_font && brandKit.paragraph_font !== brandKit.body_font) {
    typography.paragraph = {
      family: brandKit.paragraph_font,
    };
  }

  return {
    type: 'full',
    coreColors,
    extendedColors: extendedColors.length > 0 ? extendedColors : null,
    typography: Object.keys(typography).length > 0 ? typography : null,
  };
}
