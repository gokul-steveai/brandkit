-- Add custom color columns to brand_kits table
-- These columns store up to 4 custom colors beyond the default 4 (primary, secondary, accent, background)
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS custom_1_color text,
ADD COLUMN IF NOT EXISTS custom_1_name text,
ADD COLUMN IF NOT EXISTS custom_2_color text,
ADD COLUMN IF NOT EXISTS custom_2_name text,
ADD COLUMN IF NOT EXISTS custom_3_color text,
ADD COLUMN IF NOT EXISTS custom_3_name text,
ADD COLUMN IF NOT EXISTS custom_4_color text,
ADD COLUMN IF NOT EXISTS custom_4_name text;

-- Add comment explaining the color structure
COMMENT ON COLUMN brand_kits.custom_1_color IS 'Custom brand color 1 - hex value';
COMMENT ON COLUMN brand_kits.custom_1_name IS 'Custom brand color 1 - display name';
COMMENT ON COLUMN brand_kits.custom_2_color IS 'Custom brand color 2 - hex value';
COMMENT ON COLUMN brand_kits.custom_2_name IS 'Custom brand color 2 - display name';
COMMENT ON COLUMN brand_kits.custom_3_color IS 'Custom brand color 3 - hex value';
COMMENT ON COLUMN brand_kits.custom_3_name IS 'Custom brand color 3 - display name';
COMMENT ON COLUMN brand_kits.custom_4_color IS 'Custom brand color 4 - hex value';
COMMENT ON COLUMN brand_kits.custom_4_name IS 'Custom brand color 4 - display name';
COMMENT ON COLUMN brand_kits.additional_colors IS 'Extended color palette beyond the 8 core colors - JSON array of {id, name, hex}';