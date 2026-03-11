-- Add expression_overrides column to social_profiles table
-- This stores platform-specific verbal styles, terminology, and tone settings
ALTER TABLE public.social_profiles
ADD COLUMN IF NOT EXISTS expression_overrides JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.social_profiles.expression_overrides IS 'Platform-specific expression overrides including verbal_style, preferred_terminology, tone_dimensions, and ai_suggestions';