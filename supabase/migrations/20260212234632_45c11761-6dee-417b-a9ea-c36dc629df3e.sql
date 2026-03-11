
CREATE TABLE public.brand_kit_logo_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset_key text NOT NULL,
  label text NOT NULL,
  url text,
  description text,
  usage_guidelines text,
  image_width integer,
  image_height integer,
  file_size_bytes bigint,
  file_type text,
  storage_path text,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_kit_logo_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage logo assets"
  ON public.brand_kit_logo_assets FOR ALL
  USING (has_brand_kit_access(brand_kit_id, 'editor'))
  WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

CREATE POLICY "Users can view logo assets"
  ON public.brand_kit_logo_assets FOR SELECT
  USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE UNIQUE INDEX idx_logo_assets_brand_kit_key
  ON public.brand_kit_logo_assets(brand_kit_id, asset_key);

CREATE TRIGGER update_brand_kit_logo_assets_updated_at
  BEFORE UPDATE ON public.brand_kit_logo_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
