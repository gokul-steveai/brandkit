
-- Add rich data columns to brand_kit_competitors
ALTER TABLE public.brand_kit_competitors
ADD COLUMN IF NOT EXISTS color_scheme text,
ADD COLUMN IF NOT EXISTS typography jsonb,
ADD COLUMN IF NOT EXISTS button_styles jsonb,
ADD COLUMN IF NOT EXISTS spacing jsonb,
ADD COLUMN IF NOT EXISTS brand_personality jsonb,
ADD COLUMN IF NOT EXISTS design_framework text;

-- Backfill existing records from raw_scrape_data
UPDATE public.brand_kit_competitors
SET
  color_scheme = raw_scrape_data->'branding'->>'colorScheme',
  typography = raw_scrape_data->'branding'->'typography',
  button_styles = raw_scrape_data->'branding'->'components',
  spacing = raw_scrape_data->'branding'->'spacing',
  brand_personality = raw_scrape_data->'branding'->'personality',
  design_framework = raw_scrape_data->'branding'->>'designFramework'
WHERE raw_scrape_data IS NOT NULL;
