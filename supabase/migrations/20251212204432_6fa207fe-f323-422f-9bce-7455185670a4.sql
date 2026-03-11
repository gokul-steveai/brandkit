-- Add new columns to brand_kits table for comprehensive branding data
ALTER TABLE public.brand_kits 
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS text_primary_color TEXT,
ADD COLUMN IF NOT EXISTS text_secondary_color TEXT,
ADD COLUMN IF NOT EXISTS link_color TEXT,
ADD COLUMN IF NOT EXISTS color_scheme TEXT,
ADD COLUMN IF NOT EXISTS paragraph_font TEXT,
ADD COLUMN IF NOT EXISTS font_sizes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS font_weights JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS fonts_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS spacing JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS button_styles JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS input_styles JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS personality JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS og_image_url TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS raw_scrape_path TEXT;