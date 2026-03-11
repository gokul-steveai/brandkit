-- Create user_visual_assets table
CREATE TABLE public.user_visual_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'other',
  title TEXT,
  description TEXT,
  ai_analysis JSONB,
  tags TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add storage_used_bytes to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- Enable RLS on user_visual_assets
ALTER TABLE public.user_visual_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_visual_assets
CREATE POLICY "Users can view visual assets in their brand kits"
ON public.user_visual_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_kit_members
    WHERE brand_kit_members.brand_kit_id = user_visual_assets.brand_kit_id
    AND brand_kit_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brand_kits
    WHERE brand_kits.id = user_visual_assets.brand_kit_id
    AND brand_kits.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert visual assets in their brand kits"
ON public.user_visual_assets
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.brand_kit_members
      WHERE brand_kit_members.brand_kit_id = user_visual_assets.brand_kit_id
      AND brand_kit_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.brand_kits
      WHERE brand_kits.id = user_visual_assets.brand_kit_id
      AND brand_kits.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own visual assets"
ON public.user_visual_assets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visual assets"
ON public.user_visual_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_visual_assets_updated_at
BEFORE UPDATE ON public.user_visual_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_user_visual_assets_brand_kit ON public.user_visual_assets(brand_kit_id);
CREATE INDEX idx_user_visual_assets_user ON public.user_visual_assets(user_id);
CREATE INDEX idx_user_visual_assets_asset_type ON public.user_visual_assets(asset_type);

-- Create storage bucket for visual assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-visual-assets', 'user-visual-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-visual-assets bucket
CREATE POLICY "Users can view visual assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-visual-assets');

CREATE POLICY "Users can upload visual assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-visual-assets'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can update their visual assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-visual-assets'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their visual assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-visual-assets'
  AND auth.uid()::text = (storage.foldername(name))[2]
);