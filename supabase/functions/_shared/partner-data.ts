/**
 * Partner Data Mapper
 * 
 * Assembles Brand Kit OS data into compat + full objects for the partner API.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";

// ========== TYPES ==========

export interface CompatData {
  brand_description: string;
  writing_style: string;
  seo_keywords: string[];
  brand_keywords: string[];
  image_style: string;
}

export interface FullData {
  voice: {
    tone: string[];
    personality_traits: string[];
    do_phrases: string[];
    dont_phrases: string[];
    reading_level: string;
    formality: string;
    humor_level: string;
    verbal_style: Record<string, unknown>;
    voice_archetypes: unknown[];
    tone_dimensions: Record<string, unknown>;
  };
  audience: {
    personas: unknown[];
    target_roles: string[];
    pain_points: string[];
    objections: string[];
  };
  messaging: {
    value_props: string[];
    positioning: string;
    differentiators: string[];
    elevator_pitch: string;
    tagline_options: string[];
  };
  visuals: {
    image_style: string;
    color_palette: { name: string; value: string }[];
    typography: { heading: string; body: string; paragraph: string };
    visual_do: string[];
    visual_dont: string[];
  };
  seo: {
    primary_keywords: string[];
    secondary_keywords: string[];
    internal_linking_rules: string;
    geo_focus: string;
    competitor_keywords: string[];
  };
  constraints: {
    taboo_topics: string[];
    compliance_notes: string;
    claims_to_avoid: string[];
    required_disclaimers: string[];
  };
  examples: {
    good_examples: unknown[];
    bad_examples: unknown[];
    reference_urls: string[];
  };
  ctas: {
    primary_ctas: string[];
    secondary_ctas: string[];
    offer_details: string;
  };
}

export interface BrandKitApiResponse {
  brand_kit_id: string;
  workspace_id: string;
  updated_at: string;
  version: number;
  compat: CompatData;
  full: FullData;
}

// ========== HELPERS ==========

function safeArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  return [];
}

function safeString(val: unknown): string {
  if (typeof val === "string") return val;
  return "";
}

function safeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  return [];
}

function safeObj(val: unknown): Record<string, unknown> {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, unknown>;
  return {};
}

function extractNames(items: unknown[]): string[] {
  return items
    .map((item) => {
      if (item && typeof item === "object" && "name" in (item as Record<string, unknown>)) {
        return (item as Record<string, unknown>).name;
      }
      if (item && typeof item === "object" && "title" in (item as Record<string, unknown>)) {
        return (item as Record<string, unknown>).title;
      }
      return null;
    })
    .filter((v): v is string => typeof v === "string");
}

// ========== MAIN MAPPER ==========

export async function assembleBrandKitData(
  supabase: SupabaseClient,
  brandKitId: string
): Promise<BrandKitApiResponse | null> {
  // Fetch all related data in parallel
  const [
    brandKitRes,
    coreRes,
    personalityRes,
    expressionRes,
    governanceRes,
    audienceRes,
    productsRes,
    personasRes,
    examplesRes,
  ] = await Promise.all([
    supabase.from("brand_kits").select("*").eq("id", brandKitId).single(),
    supabase.from("brand_kit_core").select("*").eq("brand_kit_id", brandKitId).maybeSingle(),
    supabase.from("brand_kit_personality").select("*").eq("brand_kit_id", brandKitId).maybeSingle(),
    supabase.from("brand_kit_expression").select("*").eq("brand_kit_id", brandKitId).maybeSingle(),
    supabase.from("brand_kit_governance").select("*").eq("brand_kit_id", brandKitId).maybeSingle(),
    supabase.from("brand_kit_target_audience").select("*").eq("brand_kit_id", brandKitId),
    supabase.from("brand_kit_products").select("*").eq("brand_kit_id", brandKitId),
    supabase.from("brand_kit_personas").select("*").eq("brand_kit_id", brandKitId),
    supabase.from("expression_examples").select("*").eq("brand_kit_id", brandKitId),
  ]);

  if (brandKitRes.error || !brandKitRes.data) return null;

  const bk = brandKitRes.data;
  const core = coreRes.data || {};
  const personality = personalityRes.data || {};
  const expression = expressionRes.data || {};
  const governance = governanceRes.data || {};
  const audiences = audienceRes.data || [];
  const products = productsRes.data || [];
  const personas = personasRes.data || [];
  const examples = examplesRes.data || [];

  // Build compat
  const toneObj = safeObj(expression.tone_of_voice);
  const verbalObj = safeObj(expression.verbal_style);
  const visualObj = safeObj(expression.visual_style);
  const negDir = safeObj(governance.negative_directory);
  const personalityTraits = safeArray(personality.personality_traits);
  const brandValues = safeArray(personality.brand_values);

  const brandDescription = [
    safeString(bk.description),
    safeString(core.brand_story),
  ].filter(Boolean).join(" ");

  const writingStyleParts = [
    safeString(toneObj.overall_tone),
    ...safeStringArray(toneObj.tone_descriptors),
    safeString(verbalObj.sentence_style),
    safeString(verbalObj.vocabulary_level),
  ].filter(Boolean);

  const compat: CompatData = {
    brand_description: brandDescription,
    writing_style: writingStyleParts.join(", "),
    seo_keywords: safeStringArray(negDir.seo_keywords).length > 0
      ? safeStringArray(negDir.seo_keywords)
      : products.flatMap((p) => safeStringArray(p.key_benefits)),
    brand_keywords: [
      ...extractNames(personalityTraits),
      ...extractNames(brandValues),
    ],
    image_style: safeString(visualObj.image_style || visualObj.overall_style),
  };

  // Build full
  const behavioralConstraints = safeArray(governance.behavioral_constraints);
  const usageGuidelines = safeObj(governance.usage_guidelines);
  const writingConstraints = safeObj(governance.writing_constraints);
  const driftPrevention = safeArray(governance.drift_prevention_prompts);
  const brandPromises = safeArray(core.brand_promises);

  const full: FullData = {
    voice: {
      tone: safeStringArray(toneObj.tone_descriptors),
      personality_traits: extractNames(personalityTraits),
      do_phrases: safeStringArray(usageGuidelines.do_phrases),
      dont_phrases: safeStringArray(usageGuidelines.dont_phrases),
      reading_level: safeString(verbalObj.vocabulary_level),
      formality: safeString(toneObj.formality_level),
      humor_level: safeString(toneObj.humor_level),
      verbal_style: verbalObj,
      voice_archetypes: safeArray(expression.voice_archetypes),
      tone_dimensions: safeObj(expression.tone_dimensions),
    },
    audience: {
      personas: audiences.map((a) => ({
        name: a.persona_name,
        title: a.persona_title,
        type: a.persona_type,
        is_primary: a.is_primary,
        demographics: a.demographics,
        goals: a.goals_motivations,
        pain_points: a.frustrations_pain_points,
        values: a.values_beliefs,
        channels: a.preferred_channels,
      })),
      target_roles: audiences.map((a) => safeString(a.persona_title)).filter(Boolean),
      pain_points: audiences.flatMap((a) => safeStringArray(a.frustrations_pain_points)),
      objections: audiences.flatMap((a) => safeStringArray(a.barriers_to_sale)),
    },
    messaging: {
      value_props: brandPromises.map((p) => safeString((p as Record<string, unknown>).promise || (p as Record<string, unknown>).title)),
      positioning: safeString(core.mission),
      differentiators: products.map((p) => safeString(p.competitive_differentiation)).filter(Boolean),
      elevator_pitch: safeString(core.brand_story),
      tagline_options: [safeString(bk.tagline)].filter(Boolean),
    },
    visuals: {
      image_style: safeString(visualObj.image_style || visualObj.overall_style),
      color_palette: (() => {
        const cd = bk.color_details || {};
        const hasColorDetails = Object.keys(cd).some((k: string) => cd[k]?.light?.hex);
        if (hasColorDetails) {
          return Object.entries(cd)
            .filter(([_, v]: [string, any]) => v?.light?.hex)
            .map(([role, v]: [string, any]) => ({ name: v.name || role, value: v.light.hex }));
        }
        return [
          bk.primary_color && { name: "primary", value: bk.primary_color },
          bk.secondary_color && { name: "secondary", value: bk.secondary_color },
          bk.accent_color && { name: "accent", value: bk.accent_color },
          ...(safeArray(bk.additional_colors) as { name: string; value: string }[]),
        ].filter(Boolean) as { name: string; value: string }[];
      })(),
      typography: {
        heading: safeString(bk.heading_font),
        body: safeString(bk.body_font),
        paragraph: safeString(bk.paragraph_font),
      },
      visual_do: safeStringArray(visualObj.do_list),
      visual_dont: safeStringArray(visualObj.dont_list),
    },
    seo: {
      primary_keywords: compat.seo_keywords,
      secondary_keywords: [],
      internal_linking_rules: "",
      geo_focus: "",
      competitor_keywords: [],
    },
    constraints: {
      taboo_topics: safeStringArray(negDir.taboo_topics),
      compliance_notes: safeString(governance.compliance_notes),
      claims_to_avoid: safeStringArray(negDir.claims_to_avoid),
      required_disclaimers: [safeString(governance.disclosure_policy)].filter(Boolean),
    },
    examples: {
      good_examples: examples
        .filter((e) => e.context_type === "good" || e.context_type === "positive")
        .map((e) => ({ platform: e.platform, content: e.user_response, original: e.original_content })),
      bad_examples: examples
        .filter((e) => e.context_type === "bad" || e.context_type === "negative")
        .map((e) => ({ platform: e.platform, content: e.user_response, original: e.original_content })),
      reference_urls: [safeString(bk.website_url)].filter(Boolean),
    },
    ctas: {
      primary_ctas: products.map((p) => safeString(p.usp)).filter(Boolean),
      secondary_ctas: products.flatMap((p) => safeStringArray(p.key_benefits)),
      offer_details: products.map((p) => safeString(p.special_pricing)).filter(Boolean).join("; "),
    },
  };

  return {
    brand_kit_id: bk.id,
    workspace_id: bk.user_id,
    updated_at: bk.updated_at,
    version: bk.version || 1,
    compat,
    full,
  };
}
