import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface RequestBody {
  action: 'recommend' | 'generate';
  brandKitId: string;
  selectedFrameworks?: string[];
  selectionMethod?: 'manual' | 'ai_recommended';
}

interface BrandKitData {
  id: string;
  name: string;
  audience: Array<{
    id: string;
    persona_name: string | null;
    frustrations_pain_points: unknown;
    goals_motivations: unknown;
    is_primary: boolean | null;
  }>;
  products: Array<{
    id: string;
    name: string | null;
    description: string | null;
    usp: string | null;
  }>;
  core: {
    brand_story: string | null;
    mission: string | null;
    vision: string | null;
  } | null;
  expression: {
    tone_of_voice: unknown;
    verbal_style: unknown;
  } | null;
  personality: {
    brand_values: unknown;
    personality_traits: unknown;
  } | null;
}

// Framework definitions - must match IDs in src/lib/messaging-frameworks/definitions.ts
const FRAMEWORK_DEFINITIONS: Record<string, { name: string; description: string; emotionalLoad: string; userGoals: string[] }> = {
  pastor: {
    name: 'PASTOR',
    description: 'Problem-Amplify-Story-Testimony-Offer-Response',
    emotionalLoad: 'medium',
    userGoals: ['persuade', 'convert']
  },
  before_after_bridge: {
    name: 'Before–After–Bridge',
    description: 'Current state, desired outcome, product as bridge',
    emotionalLoad: 'medium',
    userGoals: ['educate', 'introduce']
  },
  aida: {
    name: 'AIDA',
    description: 'Attention-Interest-Desire-Action',
    emotionalLoad: 'medium',
    userGoals: ['attract', 'convert']
  },
  problem_agitate_solve: {
    name: 'Problem–Agitate–Solve',
    description: 'Problem, intensify emotional stakes, present solution',
    emotionalLoad: 'high',
    userGoals: ['persuade', 'convert']
  },
  star_story_solution: {
    name: 'Star–Story–Solution',
    description: 'Protagonist, journey/struggle, resolution via product',
    emotionalLoad: 'medium',
    userGoals: ['inspire', 'build_trust']
  },
  positive_negative: {
    name: 'Positive–Negative',
    description: 'Balanced evaluation of strengths and limitations',
    emotionalLoad: 'low',
    userGoals: ['educate', 'build_trust']
  },
  picture_promise_prove_push: {
    name: 'Picture–Promise–Prove–Push',
    description: 'Vivid outcome, promise, evidence, call to action',
    emotionalLoad: 'medium',
    userGoals: ['persuade', 'reduce_risk']
  },
  awareness_comprehension_conviction_action: {
    name: 'Awareness–Comprehension–Conviction–Action',
    description: 'Educational journey from unawareness to action',
    emotionalLoad: 'low',
    userGoals: ['educate', 'convert']
  },
  five_basic_objections: {
    name: 'Five Basic Objections',
    description: 'Address time, money, trust, belief, and need objections',
    emotionalLoad: 'medium',
    userGoals: ['overcome_resistance']
  },
  four_cs: {
    name: "Four C's",
    description: 'Clear, Concise, Compelling, and Credible',
    emotionalLoad: 'low',
    userGoals: ['clarify']
  },
  consistent_contrasting: {
    name: 'Consistent–Contrasting',
    description: 'Anchor on theme, introduce deliberate contrast',
    emotionalLoad: 'low',
    userGoals: ['engage']
  },
  strong_weak: {
    name: 'Strong–Weak',
    description: 'Lead with strengths, honestly address limitations',
    emotionalLoad: 'low',
    userGoals: ['build_trust']
  },
  emotion_logic: {
    name: 'Emotion–Logic',
    description: 'Connect emotionally first, provide rational justification',
    emotionalLoad: 'medium',
    userGoals: ['persuade']
  },
  personal_universal: {
    name: 'Personal–Universal',
    description: 'Share personal experience, extract universal truths',
    emotionalLoad: 'medium',
    userGoals: ['inspire']
  },
  urgency_patience: {
    name: 'Urgency–Patience',
    description: 'Balance immediate action with long-term value',
    emotionalLoad: 'medium',
    userGoals: ['motivate_action']
  },
  expectation_surprise: {
    name: 'Expectation–Surprise',
    description: 'Set up conventional expectations, then subvert them',
    emotionalLoad: 'low',
    userGoals: ['differentiate']
  },
  exclusive_inclusive: {
    name: 'Exclusive–Inclusive',
    description: 'Signal selectivity while inviting participation',
    emotionalLoad: 'low',
    userGoals: ['position_premium']
  },
  past_present_future: {
    name: 'Past–Present–Future',
    description: 'Acknowledge history, describe now, paint vision',
    emotionalLoad: 'low',
    userGoals: ['vision']
  },
  friend_expert: {
    name: 'Friend–Expert',
    description: 'Combine empathy with expertise',
    emotionalLoad: 'low',
    userGoals: ['advise']
  },
  pain_agitate_relief: {
    name: 'Pain–Agitate–Relief',
    description: 'Identify pain, heighten it, provide relief',
    emotionalLoad: 'high',
    userGoals: ['convert']
  },
  solution_savings_social_proof: {
    name: 'Solution–Savings–Social Proof',
    description: 'Present solution, quantify value, reinforce with proof',
    emotionalLoad: 'low',
    userGoals: ['justify_purchase']
  },
  six_ws: {
    name: "Six W's",
    description: 'Who, What, When, Where, Why, and How',
    emotionalLoad: 'low',
    userGoals: ['clarify']
  }
};

function calculateTokenCost(frameworkCount: number, includesAiSelection: boolean): number {
  let cost = 0;
  if (includesAiSelection) cost += 1;
  if (frameworkCount <= 10) cost += 2;
  else if (frameworkCount <= 15) cost += 3;
  else cost += 5;
  return cost;
}

async function fetchBrandKitData(supabase: any, brandKitId: string): Promise<BrandKitData> {
  const [brandKit, audience, products, core, expression, personality] = await Promise.all([
    supabase.from('brand_kits').select('id, name').eq('id', brandKitId).single(),
    supabase.from('brand_kit_target_audience').select('id, persona_name, frustrations_pain_points, goals_motivations, is_primary').eq('brand_kit_id', brandKitId),
    supabase.from('brand_kit_products').select('id, name, description, usp').eq('brand_kit_id', brandKitId),
    supabase.from('brand_kit_core').select('brand_story, mission, vision').eq('brand_kit_id', brandKitId).maybeSingle(),
    supabase.from('brand_kit_expression').select('tone_of_voice, verbal_style').eq('brand_kit_id', brandKitId).maybeSingle(),
    supabase.from('brand_kit_personality').select('brand_values, personality_traits').eq('brand_kit_id', brandKitId).maybeSingle()
  ]);

  const brandKitData = brandKit.data as { id: string; name: string } | null;

  return {
    id: brandKitData?.id || brandKitId,
    name: brandKitData?.name || 'Brand',
    audience: (audience.data as any[]) || [],
    products: (products.data as any[]) || [],
    core: core.data as BrandKitData['core'],
    expression: expression.data as BrandKitData['expression'],
    personality: personality.data as BrandKitData['personality']
  };
}

async function callLovableAI(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch(LOVABLE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 8000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function recommendFrameworks(brandKitData: BrandKitData): Promise<string[]> {
  const systemPrompt = `You are an expert copywriting strategist. Analyze the brand context and recommend the most suitable messaging frameworks.

Available frameworks: ${Object.entries(FRAMEWORK_DEFINITIONS).map(([id, f]) => `${id}: ${f.name} - ${f.description}`).join('\n')}

Return ONLY a JSON array of framework IDs (e.g., ["pastor", "aida", "bab"]).
Recommend 5-10 frameworks that best match the brand's:
- Target audience pain points and goals
- Product/service type
- Brand personality and tone
- Marketing objectives`;

  const primaryPersona = brandKitData.audience.find(a => a.is_primary) || brandKitData.audience[0];
  const primaryProduct = brandKitData.products[0];

  const prompt = `Analyze this brand and recommend messaging frameworks:

Brand: ${brandKitData.name}

Target Persona: ${primaryPersona?.persona_name || 'Not defined'}
Pain Points: ${JSON.stringify(primaryPersona?.frustrations_pain_points || [])}
Goals: ${JSON.stringify(primaryPersona?.goals_motivations || [])}

Product: ${primaryProduct?.name || 'Not defined'}
Description: ${primaryProduct?.description || ''}
USP: ${primaryProduct?.usp || ''}

Brand Story: ${brandKitData.core?.brand_story || 'Not defined'}
Mission: ${brandKitData.core?.mission || 'Not defined'}
Tone: ${JSON.stringify(brandKitData.expression?.tone_of_voice || {})}
Values: ${JSON.stringify(brandKitData.personality?.brand_values || [])}`;

  const response = await callLovableAI(prompt, systemPrompt);
  
  try {
    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI recommendation:', e);
  }
  
  // Default fallback - use valid framework IDs
  return ['pastor', 'aida', 'before_after_bridge', 'problem_agitate_solve', 'four_cs'];
}

async function generateFrameworkContent(
  selectedFrameworks: string[],
  brandKitData: BrandKitData
): Promise<{ markdown: string; json: Record<string, unknown> }> {
  const systemPrompt = `You are an expert copywriter creating a comprehensive Messaging Framework Specification.

For each framework, generate:
1. A brand-specific example with variable callouts (e.g., [[Pain Point: specific pain]])
2. When to use this framework
3. Failure modes to avoid

Format as structured Markdown with clear sections.
Use the brand's actual data to create realistic, actionable examples.`;

  const primaryPersona = brandKitData.audience.find(a => a.is_primary) || brandKitData.audience[0];
  const primaryProduct = brandKitData.products[0];

  const frameworkDescriptions = selectedFrameworks
    .map(id => {
      const def = FRAMEWORK_DEFINITIONS[id as keyof typeof FRAMEWORK_DEFINITIONS];
      return def ? `- ${def.name} (${id}): ${def.description}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `Generate a comprehensive Messaging Framework Specification for:

Brand: ${brandKitData.name}

== TARGET AUDIENCE ==
Persona: ${primaryPersona?.persona_name || 'Target Customer'}
Pain Points: ${JSON.stringify(primaryPersona?.frustrations_pain_points || ['Not defined'])}
Goals: ${JSON.stringify(primaryPersona?.goals_motivations || ['Not defined'])}

== PRODUCT/SERVICE ==
Name: ${primaryProduct?.name || 'Product'}
Description: ${primaryProduct?.description || 'Not defined'}
USP: ${primaryProduct?.usp || 'Not defined'}

== BRAND CONTEXT ==
Brand Story: ${brandKitData.core?.brand_story || 'Not defined'}
Mission: ${brandKitData.core?.mission || 'Not defined'}
Vision: ${brandKitData.core?.vision || 'Not defined'}
Tone of Voice: ${JSON.stringify(brandKitData.expression?.tone_of_voice || {})}
Values: ${JSON.stringify(brandKitData.personality?.brand_values || [])}

== SELECTED FRAMEWORKS ==
${frameworkDescriptions}

For EACH framework, provide:
1. **Framework Overview** - Brief explanation
2. **Brand-Specific Example** - Using actual brand data with [[Variable: value]] callouts
3. **Best Use Cases** - When to deploy this framework
4. **Failure Modes** - What to avoid
5. **Emotional Load** - Low/Medium/High and implications`;

  const content = await callLovableAI(prompt, systemPrompt);

  // Build the full markdown document
  const markdown = `# Messaging Framework Specification

## Brand: ${brandKitData.name}

**Generated:** ${new Date().toISOString().split('T')[0]}

---

## Executive Summary

This specification provides ${selectedFrameworks.length} messaging frameworks tailored to ${brandKitData.name}'s brand voice, target audience, and product positioning.

### Quick Reference

| Framework | Emotional Load | Primary Use |
|-----------|----------------|-------------|
${selectedFrameworks.map(id => {
  const def = FRAMEWORK_DEFINITIONS[id as keyof typeof FRAMEWORK_DEFINITIONS];
  return def ? `| ${def.name} | ${def.emotionalLoad} | ${def.userGoals[0]?.replace('_', ' ')} |` : '';
}).filter(Boolean).join('\n')}

---

## Brand Context

### Target Persona: ${primaryPersona?.persona_name || 'Target Customer'}

**Pain Points:**
${Array.isArray(primaryPersona?.frustrations_pain_points) 
  ? (primaryPersona.frustrations_pain_points as string[]).map((p: string) => `- ${p}`).join('\n')
  : '- Not defined'}

**Goals:**
${Array.isArray(primaryPersona?.goals_motivations)
  ? (primaryPersona.goals_motivations as string[]).map((g: string) => `- ${g}`).join('\n')
  : '- Not defined'}

### Product: ${primaryProduct?.name || 'Product'}

${primaryProduct?.description || 'No description provided.'}

**USP:** ${primaryProduct?.usp || 'Not defined'}

---

## Framework Specifications

${content}

---

## Implementation Notes

1. **Variable Callouts**: Text in [[brackets]] indicates where to substitute brand-specific content
2. **Emotional Load**: Consider audience sensitivity when using high-intensity frameworks
3. **A/B Testing**: Test framework variations to optimize performance
4. **Brand Voice**: All examples should be adapted to match your established tone guidelines

---

*This specification was generated based on your Brand Kit data. Update your brand kit to regenerate with new information.*
`;

  const json = {
    brandKitId: brandKitData.id,
    brandName: brandKitData.name,
    selectedFrameworks,
    generatedAt: new Date().toISOString(),
    persona: primaryPersona?.persona_name,
    product: primaryProduct?.name,
    frameworkCount: selectedFrameworks.length
  };

  return { markdown, json };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(origin);
  }

  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Create client with anon key + user's auth header (Option 2 pattern)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader }
      },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Authenticated user:', user.id);

    const body = await req.json() as RequestBody;
    const { action, brandKitId, selectedFrameworks, selectionMethod } = body;

    // Verify brand kit access - check ownership directly (not via RPC that uses auth.uid())
    const { data: brandKit, error: brandKitError } = await supabaseClient
      .from('brand_kits')
      .select('user_id')
      .eq('id', brandKitId)
      .single();

    const isOwner = !brandKitError && brandKit?.user_id === user.id;

    // Check membership if not owner
    let isMember = false;
    let memberRole: string | null = null;
    if (!isOwner) {
      const { data: member } = await supabaseClient
        .from('brand_kit_members')
        .select('role')
        .eq('brand_kit_id', brandKitId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (member) {
        isMember = true;
        memberRole = member.role;
      }
    }

    console.log('Access check result:', { 
      userId: user.id, 
      brandKitId, 
      isOwner, 
      isMember,
      role: isOwner ? 'owner' : memberRole 
    });

    // Require owner or member with editor/admin role
    const hasEditorAccess = isOwner || 
      (isMember && ['editor', 'admin'].includes(memberRole || ''));

    if (!hasEditorAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to brand kit' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch brand kit data
    const brandKitData = await fetchBrandKitData(supabaseClient, brandKitId);

    // Handle AI recommendation request
    if (action === 'recommend') {
      const recommended = await recommendFrameworks(brandKitData);
      return new Response(JSON.stringify({ recommendedFrameworks: recommended }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle generation request
    if (action === 'generate') {
      if (!selectedFrameworks || selectedFrameworks.length === 0) {
        return new Response(JSON.stringify({ error: 'No frameworks selected' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calculate token cost
      const tokenCost = calculateTokenCost(
        selectedFrameworks.length, 
        selectionMethod === 'ai_recommended'
      );

      // Check user has enough tokens
      const { data: subscription } = await supabaseClient
        .from('user_subscriptions')
        .select('tokens_balance')
        .eq('user_id', user.id)
        .single();

      if (!subscription || subscription.tokens_balance < tokenCost) {
        return new Response(JSON.stringify({ 
          error: 'Insufficient tokens',
          required: tokenCost,
          available: subscription?.tokens_balance || 0
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate content
      const { markdown, json } = await generateFrameworkContent(selectedFrameworks, brandKitData);

      // Get next version
      const { data: nextVersion } = await supabaseClient.rpc('get_next_messaging_framework_version', {
        p_brand_kit_id: brandKitId
      });

      // Store in database
      const { data: spec, error: insertError } = await supabaseClient
        .from('messaging_framework_specs')
        .insert({
          brand_kit_id: brandKitId,
          user_id: user.id,
          version: nextVersion || 1,
          title: `Messaging Framework Spec v${nextVersion || 1}`,
          selected_frameworks: selectedFrameworks,
          selection_method: selectionMethod || 'manual',
          content_markdown: markdown,
          content_json: json,
          generation_config: {
            primaryPersonaId: brandKitData.audience.find(a => a.is_primary)?.id,
            primaryProductId: brandKitData.products[0]?.id,
            selectedFrameworkIds: selectedFrameworks,
            selectionMethod: selectionMethod || 'manual'
          },
          tokens_used: tokenCost
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save specification' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Deduct tokens
      const newBalance = subscription.tokens_balance - tokenCost;
      await supabaseClient
        .from('user_subscriptions')
        .update({ tokens_balance: newBalance })
        .eq('user_id', user.id);

      // Log transaction
      await supabaseClient.from('token_transactions').insert({
        user_id: user.id,
        brand_kit_id: brandKitId,
        transaction_type: 'generation',
        tokens_amount: -tokenCost,
        tokens_balance_after: newBalance,
        description: `Generated Messaging Framework Spec (${selectedFrameworks.length} frameworks)`,
        function_name: 'generate-messaging-framework-spec'
      });

      return new Response(JSON.stringify({ 
        success: true,
        spec: {
          id: spec.id,
          version: spec.version,
          title: spec.title,
          contentMarkdown: spec.content_markdown,
          tokensUsed: tokenCost
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
