import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const { brandKitId } = await req.json();
    if (!brandKitId) {
      return new Response(JSON.stringify({ success: false, error: 'brandKitId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch brand kit data for context
    const [brandKitRes, coreRes, personalityRes, expressionRes, productsRes] = await Promise.all([
      supabase.from('brand_kits').select('name, description, tagline').eq('id', brandKitId).single(),
      supabase.from('brand_kit_core').select('mission, vision').eq('brand_kit_id', brandKitId).maybeSingle(),
      supabase.from('brand_kit_personality').select('brand_values').eq('brand_kit_id', brandKitId).maybeSingle(),
      supabase.from('brand_kit_expression').select('tone_of_voice').eq('brand_kit_id', brandKitId).maybeSingle(),
      supabase.from('brand_kit_products').select('name, description').eq('brand_kit_id', brandKitId),
    ]);

    const brandKit = brandKitRes.data;
    const core = coreRes.data;
    const personality = personalityRes.data;
    const products = productsRes.data || [];

    const contextParts = [];
    if (brandKit?.name) contextParts.push(`Brand: ${brandKit.name}`);
    if (brandKit?.description) contextParts.push(`Description: ${brandKit.description}`);
    if (brandKit?.tagline) contextParts.push(`Tagline: ${brandKit.tagline}`);
    if (core?.mission) contextParts.push(`Mission: ${core.mission}`);
    if (core?.vision) contextParts.push(`Vision: ${core.vision}`);
    if (products.length > 0) {
      contextParts.push(`Products: ${products.map(p => p.name).join(', ')}`);
    }

    const prompt = `Based on this brand information, suggest 10-15 SEO keywords and phrases that would help this brand rank well in search engines. Focus on keywords that are relevant, specific, and have good search intent.

${contextParts.join('\n')}

Return ONLY a JSON array of keyword strings, nothing else. Example: ["keyword1", "keyword2", "keyword3"]`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai-gateway.lovable.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', errText);
      return new Response(JSON.stringify({ success: false, error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || '[]';

    // Parse JSON from response
    let suggestions: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse AI response:', content);
      suggestions = [];
    }

    // Save suggestions to brand_kit_seo
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Upsert
    const { data: existing } = await serviceClient
      .from('brand_kit_seo')
      .select('id')
      .eq('brand_kit_id', brandKitId)
      .maybeSingle();

    if (existing) {
      await serviceClient
        .from('brand_kit_seo')
        .update({ suggested_keywords: suggestions })
        .eq('id', existing.id);
    } else {
      await serviceClient
        .from('brand_kit_seo')
        .insert({ brand_kit_id: brandKitId, suggested_keywords: suggestions });
    }

    // Deduct token
    try {
      await serviceClient.rpc('deduct_token' as any, { p_user_id: userId, p_function_name: 'suggest-seo-keywords' } as any);
    } catch (e) {
      console.warn('Token deduction skipped:', e);
    }

    return new Response(JSON.stringify({ success: true, suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
