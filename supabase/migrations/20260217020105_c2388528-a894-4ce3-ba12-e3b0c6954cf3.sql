
-- Add color_details JSONB column
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS color_details jsonb DEFAULT '{}'::jsonb;

-- Backfill all existing brand kits
UPDATE brand_kits SET color_details = jsonb_build_object(
  'primary', CASE WHEN primary_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object(
      'hex', primary_color,
      'description', COALESCE(additional_colors->'_metadata'->'primary_color'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'primary_color'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END,
  'secondary', CASE WHEN secondary_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object(
      'hex', secondary_color,
      'description', COALESCE(additional_colors->'_metadata'->'secondary_color'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'secondary_color'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END,
  'accent', CASE WHEN accent_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object(
      'hex', accent_color,
      'description', COALESCE(additional_colors->'_metadata'->'accent_color'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'accent_color'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END,
  'background', CASE WHEN background_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object('hex', background_color, 'description', '', 'useWhen', '')
  ) ELSE '{}'::jsonb END,
  'text_primary', CASE WHEN text_primary_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object('hex', text_primary_color, 'description', '', 'useWhen', '')
  ) ELSE '{}'::jsonb END,
  'text_secondary', CASE WHEN text_secondary_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object('hex', text_secondary_color, 'description', '', 'useWhen', '')
  ) ELSE '{}'::jsonb END,
  'link', CASE WHEN link_color IS NOT NULL THEN jsonb_build_object(
    'light', jsonb_build_object('hex', link_color, 'description', '', 'useWhen', '')
  ) ELSE '{}'::jsonb END,
  'custom_1', CASE WHEN custom_1_color IS NOT NULL THEN jsonb_build_object(
    'name', COALESCE(custom_1_name, ''),
    'light', jsonb_build_object(
      'hex', custom_1_color,
      'description', COALESCE(additional_colors->'_metadata'->'custom_1'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'custom_1'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END,
  'custom_2', CASE WHEN custom_2_color IS NOT NULL THEN jsonb_build_object(
    'name', COALESCE(custom_2_name, ''),
    'light', jsonb_build_object(
      'hex', custom_2_color,
      'description', COALESCE(additional_colors->'_metadata'->'custom_2'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'custom_2'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END,
  'custom_3', CASE WHEN custom_3_color IS NOT NULL THEN jsonb_build_object(
    'name', COALESCE(custom_3_name, ''),
    'light', jsonb_build_object(
      'hex', custom_3_color,
      'description', COALESCE(additional_colors->'_metadata'->'custom_3'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'custom_3'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END,
  'custom_4', CASE WHEN custom_4_color IS NOT NULL THEN jsonb_build_object(
    'name', COALESCE(custom_4_name, ''),
    'light', jsonb_build_object(
      'hex', custom_4_color,
      'description', COALESCE(additional_colors->'_metadata'->'custom_4'->>'description', ''),
      'useWhen', COALESCE(additional_colors->'_metadata'->'custom_4'->>'useWhen', '')
    )
  ) ELSE '{}'::jsonb END
);
