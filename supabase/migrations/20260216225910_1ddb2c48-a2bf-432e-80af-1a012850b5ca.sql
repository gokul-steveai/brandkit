
-- Create brand_kit_competitors table
CREATE TABLE public.brand_kit_competitors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  url text NOT NULL,
  name text,
  description text,
  logo_url text,
  brand_colors jsonb DEFAULT '[]'::jsonb,
  fonts jsonb DEFAULT '[]'::jsonb,
  tagline text,
  value_propositions jsonb DEFAULT '[]'::jsonb,
  social_profiles jsonb DEFAULT '[]'::jsonb,
  raw_scrape_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_kit_competitors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage brand kit competitors"
  ON public.brand_kit_competitors FOR ALL
  USING (has_brand_kit_access(brand_kit_id, 'editor'))
  WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

CREATE POLICY "Users can view brand kit competitors"
  ON public.brand_kit_competitors FOR SELECT
  USING (has_brand_kit_access(brand_kit_id, 'viewer'));

-- Create brand_kit_seo table (one row per brand kit)
CREATE TABLE public.brand_kit_seo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_kit_id uuid NOT NULL UNIQUE REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  keywords jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  suggested_keywords jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_kit_seo ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage brand kit seo"
  ON public.brand_kit_seo FOR ALL
  USING (has_brand_kit_access(brand_kit_id, 'editor'))
  WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

CREATE POLICY "Users can view brand kit seo"
  ON public.brand_kit_seo FOR SELECT
  USING (has_brand_kit_access(brand_kit_id, 'viewer'));

-- Timestamp trigger for competitors
CREATE TRIGGER update_brand_kit_competitors_updated_at
  BEFORE UPDATE ON public.brand_kit_competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Timestamp trigger for seo
CREATE TRIGGER update_brand_kit_seo_updated_at
  BEFORE UPDATE ON public.brand_kit_seo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
