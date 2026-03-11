-- Create brand_kit_exports table for storing export files with rich metadata
CREATE TABLE public.brand_kit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- File identification
  title TEXT NOT NULL,
  description TEXT,
  reference_name TEXT NOT NULL,
  
  -- Export metadata
  export_type TEXT NOT NULL,
  export_format TEXT NOT NULL,
  
  -- Storage reference
  storage_bucket TEXT NOT NULL DEFAULT 'brand-kit-exports',
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  
  -- Configuration & content tracking
  sections_included JSONB NOT NULL DEFAULT '[]'::jsonb,
  export_config JSONB DEFAULT '{}'::jsonb,
  gaps_filled JSONB DEFAULT '[]'::jsonb,
  
  -- AI-friendly metadata
  meta_tags JSONB DEFAULT '[]'::jsonb,
  content_summary TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_export_id UUID REFERENCES public.brand_kit_exports(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_kit_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policy for users to manage their own exports
CREATE POLICY "Users can manage their own exports"
  ON public.brand_kit_exports FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create storage bucket for exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-kit-exports', 'brand-kit-exports', false);

-- Storage RLS for users to manage their export files
CREATE POLICY "Users can manage their export files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'brand-kit-exports' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'brand-kit-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
CREATE TRIGGER update_brand_kit_exports_updated_at
  BEFORE UPDATE ON public.brand_kit_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();