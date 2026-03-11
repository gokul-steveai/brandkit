-- Phase 3: Expression Section Enhancements
-- Add voice_archetypes, tone_dimensions, and content_categories to brand_kit_expression

-- Add voice_archetypes column for primary/secondary/anti archetypes
ALTER TABLE public.brand_kit_expression
ADD COLUMN IF NOT EXISTS voice_archetypes JSONB;

-- Add tone_dimensions column for slider values (0-100 scales)
ALTER TABLE public.brand_kit_expression
ADD COLUMN IF NOT EXISTS tone_dimensions JSONB;

-- Add content_categories column for content type templates
ALTER TABLE public.brand_kit_expression
ADD COLUMN IF NOT EXISTS content_categories JSONB;

-- Add comments for documentation
COMMENT ON COLUMN public.brand_kit_expression.voice_archetypes IS 'Voice archetypes: { primary: {...}, secondary: {...}, antiArchetypes: [...] }';
COMMENT ON COLUMN public.brand_kit_expression.tone_dimensions IS 'Tone slider values: { formality: 0-100, energy: 0-100, warmth: 0-100, confidence: 0-100, complexity: 0-100 }';
COMMENT ON COLUMN public.brand_kit_expression.content_categories IS 'Content category templates with structure, tone shifts, and key phrases';

-- Phase 4: Governance Enhancements
-- Add writing_constraints and drift_prevention_prompts to brand_kit_governance

ALTER TABLE public.brand_kit_governance
ADD COLUMN IF NOT EXISTS writing_constraints JSONB;

ALTER TABLE public.brand_kit_governance
ADD COLUMN IF NOT EXISTS drift_prevention_prompts JSONB;

COMMENT ON COLUMN public.brand_kit_governance.writing_constraints IS 'Hard constraints and soft guidelines for writing: { hardConstraints: [...], softGuidelines: [...], platformSpecific: {...} }';
COMMENT ON COLUMN public.brand_kit_governance.drift_prevention_prompts IS 'Negative prompts to prevent off-brand AI content generation';