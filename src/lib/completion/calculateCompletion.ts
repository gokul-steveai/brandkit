import { supabase } from '@/integrations/supabase/client';
import type { BrandKit } from '@/hooks/useBrandKits';

export interface SectionProgress {
  score: number;
  weight: number;
  filled: number;
  total: number;
  label: string;
}

export interface CompletionResult {
  total: number;
  sections: Record<string, SectionProgress>;
}

// Section weights (must sum to 100)
const SECTION_WEIGHTS = {
  overview: 25,
  personality: 15,
  core: 15,
  expression: 15,
  personasAudience: 15,
  governance: 5,
  web: 10,
} as const;

function countFilledFields(obj: Record<string, unknown> | null | undefined, fields: string[]): number {
  if (!obj) return 0;
  return fields.filter(field => {
    const value = obj[field];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    return true;
  }).length;
}

function hasAnyContent(jsonValue: unknown): boolean {
  if (!jsonValue) return false;
  if (Array.isArray(jsonValue)) return jsonValue.length > 0;
  if (typeof jsonValue === 'object') return Object.keys(jsonValue).length > 0;
  return true;
}

export async function calculateBrandKitCompletion(brandKitId: string): Promise<CompletionResult> {
  // Fetch all related data in parallel
  const [
    { data: brandKit },
    { data: core },
    { data: personality },
    { data: expression },
    { data: audiences },
    { data: personas },
    { data: governance },
    { data: socialProfiles },
  ] = await Promise.all([
    supabase.from('brand_kits').select('*').eq('id', brandKitId).single(),
    supabase.from('brand_kit_core').select('*').eq('brand_kit_id', brandKitId).maybeSingle(),
    supabase.from('brand_kit_personality').select('*').eq('brand_kit_id', brandKitId).maybeSingle(),
    supabase.from('brand_kit_expression').select('*').eq('brand_kit_id', brandKitId).maybeSingle(),
    supabase.from('brand_kit_target_audience').select('id').eq('brand_kit_id', brandKitId),
    supabase.from('brand_kit_personas').select('id').eq('brand_kit_id', brandKitId),
    supabase.from('brand_kit_governance').select('*').eq('brand_kit_id', brandKitId).maybeSingle(),
    supabase.from('social_profiles').select('id').eq('brand_kit_id', brandKitId),
  ]);

  const sections: Record<string, SectionProgress> = {};

  // Overview (25%): name, description, logo, colors, fonts, tagline
  const overviewFields = [
    'name', 'description', 'logo_url', 'tagline',
    'primary_color', 'secondary_color', 'accent_color',
    'background_color', 'text_primary_color',
    'heading_font', 'body_font'
  ];
  const overviewFilled = countFilledFields(brandKit as Record<string, unknown>, overviewFields);
  sections.overview = {
    score: (overviewFilled / overviewFields.length) * 100,
    weight: SECTION_WEIGHTS.overview,
    filled: overviewFilled,
    total: overviewFields.length,
    label: 'Overview',
  };

  // Personality (15%): Has any values, moods, traits, or principles
  const personalityItems = [
    hasAnyContent(personality?.brand_values),
    hasAnyContent(personality?.brand_moods),
    hasAnyContent(personality?.personality_traits),
    hasAnyContent(personality?.brand_principles),
  ];
  const personalityFilled = personalityItems.filter(Boolean).length;
  sections.personality = {
    score: (personalityFilled / 4) * 100,
    weight: SECTION_WEIGHTS.personality,
    filled: personalityFilled,
    total: 4,
    label: 'Personality',
  };

  // Core (15%): Mission, vision, story, promises, industry
  const coreItems = [
    !!core?.mission,
    !!core?.vision,
    !!core?.brand_story,
    hasAnyContent(core?.brand_promises),
    !!core?.industry_classification_id,
  ];
  const coreFilled = coreItems.filter(Boolean).length;
  sections.core = {
    score: (coreFilled / 5) * 100,
    weight: SECTION_WEIGHTS.core,
    filled: coreFilled,
    total: 5,
    label: 'Core',
  };

  // Expression (15%): Tone, verbal style, archetypes, terminology
  const expressionItems = [
    hasAnyContent(expression?.tone_of_voice),
    hasAnyContent(expression?.verbal_style),
    hasAnyContent(expression?.voice_archetypes),
    hasAnyContent(expression?.preferred_terminology),
  ];
  const expressionFilled = expressionItems.filter(Boolean).length;
  sections.expression = {
    score: (expressionFilled / 4) * 100,
    weight: SECTION_WEIGHTS.expression,
    filled: expressionFilled,
    total: 4,
    label: 'Expression',
  };

  // Personas & Audience (15%): At least 1 audience + 1 persona
  const audienceCount = audiences?.length ?? 0;
  const personaCount = personas?.length ?? 0;
  const paFilled = (audienceCount > 0 ? 1 : 0) + (personaCount > 0 ? 1 : 0);
  sections.personasAudience = {
    score: (paFilled / 2) * 100,
    weight: SECTION_WEIGHTS.personasAudience,
    filled: paFilled,
    total: 2,
    label: 'Personas & Audience',
  };

  // Governance (5%): Has any governance rules
  const governanceItems = [
    hasAnyContent(governance?.negative_directory),
    hasAnyContent(governance?.behavioral_constraints),
    hasAnyContent(governance?.usage_guidelines),
    !!governance?.compliance_notes,
    !!governance?.disclosure_policy,
  ];
  const governanceFilled = governanceItems.filter(Boolean).length;
  sections.governance = {
    score: governanceFilled > 0 ? 100 : 0,
    weight: SECTION_WEIGHTS.governance,
    filled: Math.min(governanceFilled, 1),
    total: 1,
    label: 'Governance',
  };

  // Web (10%): At least 1 social profile or competitor
  const socialCount = socialProfiles?.length ?? 0;
  sections.web = {
    score: socialCount > 0 ? 100 : 0,
    weight: SECTION_WEIGHTS.web,
    filled: Math.min(socialCount, 1),
    total: 1,
    label: 'Web',
  };

  // Calculate weighted total
  const total = Object.values(sections).reduce((acc, section) => {
    return acc + (section.score * section.weight) / 100;
  }, 0);

  return {
    total: Math.round(total),
    sections,
  };
}

// Synchronous version for quick calculation from existing data (used in list view)
export function calculateCompletionFromBrandKit(kit: Partial<BrandKit>): number {
  const fields = [
    'name', 'description', 'primary_color', 'secondary_color', 'accent_color',
    'heading_font', 'body_font', 'logo_url', 'tagline', 'brand_voice',
    'background_color', 'text_primary_color', 'personality', 'summary'
  ];
  
  const filledCount = fields.filter(field => {
    const value = kit[field as keyof typeof kit];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value === '') return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }).length;
  
  return Math.round((filledCount / fields.length) * 100);
}
