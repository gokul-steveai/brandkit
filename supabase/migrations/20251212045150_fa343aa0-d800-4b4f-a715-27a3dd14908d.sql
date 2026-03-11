-- Drop old ID array columns and add new JSONB columns
ALTER TABLE brand_kit_personality 
  DROP COLUMN IF EXISTS trait_ids,
  DROP COLUMN IF EXISTS value_ids,
  DROP COLUMN IF EXISTS principle_ids,
  DROP COLUMN IF EXISTS mood_ids;

ALTER TABLE brand_kit_personality 
  ADD COLUMN personality_traits JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN brand_values JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN brand_principles JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN brand_moods JSONB DEFAULT '[]'::jsonb;