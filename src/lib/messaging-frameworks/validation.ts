import type { BrandKitDataCompleteness } from './types';
export interface BrandKitWithRelations {
  id: string;
  name: string;
  audience?: Array<{
    id: string;
    persona_name: string | null;
    frustrations_pain_points: unknown;
    goals_motivations: unknown;
    is_primary: boolean | null;
  }>;
  products?: Array<{
    id: string;
    name: string;
    description: string | null;
    usp: string | null;
  }>;
  core?: {
    brand_story: string | null;
    mission: string | null;
    vision: string | null;
  } | null;
  expression?: {
    tone_of_voice: unknown;
    verbal_style: unknown;
  } | null;
  personality?: {
    brand_values: unknown;
    personality_traits: unknown;
  } | null;
}

/**
 * Validates brand kit data completeness for messaging framework generation.
 * 
 * Required data (blocks generation if missing):
 * - At least one persona with name and pain points
 * - At least one product with name and description/USP
 * 
 * Recommended data (warnings but allows generation):
 * - Brand story
 * - Tone of voice
 * - Brand values
 */
export function validateBrandKitData(brandKit: BrandKitWithRelations): BrandKitDataCompleteness {
  const missingRequired: string[] = [];
  const missingSoftRecommended: string[] = [];
  
  // Check persona data
  const personas = brandKit.audience || [];
  const primaryPersona = personas.find(p => p.is_primary) || personas[0];
  
  const hasPersona = !!primaryPersona?.persona_name;
  const painPoints = primaryPersona?.frustrations_pain_points;
  const hasPainPoints = !!(painPoints && Array.isArray(painPoints) && painPoints.length > 0);
  const goals = primaryPersona?.goals_motivations;
  const hasGoals = !!(goals && Array.isArray(goals) && goals.length > 0);
  
  if (!hasPersona) {
    missingRequired.push('Target audience persona name');
  }
  if (!hasPainPoints) {
    missingRequired.push('Persona pain points/frustrations');
  }
  if (!hasGoals) {
    missingRequired.push('Persona goals/motivations');
  }
  
  // Check product data
  const products = brandKit.products || [];
  const primaryProduct = products[0];
  
  const hasProduct = !!primaryProduct?.name;
  const hasProductDescription = !!(primaryProduct?.description || primaryProduct?.usp);
  
  if (!hasProduct) {
    missingRequired.push('Product/service name');
  }
  if (hasProduct && !hasProductDescription) {
    missingRequired.push('Product description or USP');
  }
  
  // Check soft requirements
  const hasBrandStory = !!brandKit.core?.brand_story;
  const toneOfVoice = brandKit.expression?.tone_of_voice;
  const hasToneOfVoice = !!(toneOfVoice && typeof toneOfVoice === 'object' && Object.keys(toneOfVoice).length > 0);
  const brandValues = brandKit.personality?.brand_values;
  const hasBrandValues = !!(brandValues && Array.isArray(brandValues) && brandValues.length > 0);
  
  if (!hasBrandStory) {
    missingSoftRecommended.push('Brand story');
  }
  if (!hasToneOfVoice) {
    missingSoftRecommended.push('Tone of voice');
  }
  if (!hasBrandValues) {
    missingSoftRecommended.push('Brand values');
  }
  
  // Calculate completeness score
  const requiredItems = 5; // persona, pain points, goals, product, product description
  const softItems = 3; // brand story, tone, values
  const totalItems = requiredItems + softItems;
  
  let filledItems = 0;
  if (hasPersona) filledItems++;
  if (hasPainPoints) filledItems++;
  if (hasGoals) filledItems++;
  if (hasProduct) filledItems++;
  if (hasProductDescription) filledItems++;
  if (hasBrandStory) filledItems++;
  if (hasToneOfVoice) filledItems++;
  if (hasBrandValues) filledItems++;
  
  const completenessScore = Math.round((filledItems / totalItems) * 100);
  const canGenerate = missingRequired.length === 0;
  
  return {
    hasPersona,
    hasPainPoints,
    hasGoals,
    hasProduct,
    hasProductDescription,
    hasBrandStory,
    hasToneOfVoice,
    hasBrandValues,
    missingRequired,
    missingSoftRecommended,
    completenessScore,
    canGenerate
  };
}

/**
 * Calculate token cost based on number of frameworks selected
 */
export function calculateTokenCost(frameworkCount: number, includesAiSelection: boolean): number {
  let cost = 0;
  
  // AI selection costs 1 token
  if (includesAiSelection) {
    cost += 1;
  }
  
  // Generation cost based on framework count
  if (frameworkCount <= 10) {
    cost += 2;
  } else if (frameworkCount <= 15) {
    cost += 3;
  } else {
    cost += 5;
  }
  
  return cost;
}
