-- Add brand_kit_social_urls column to brand_kits table
ALTER TABLE public.brand_kits
ADD COLUMN IF NOT EXISTS brand_kit_social_urls jsonb DEFAULT '[]'::jsonb;

-- Add missing columns to social_profiles table for Apify response fields
ALTER TABLE public.social_profiles
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS external_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS follows_count integer,
ADD COLUMN IF NOT EXISTS highlight_reel_count integer,
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS business_category text,
ADD COLUMN IF NOT EXISTS igtv_video_count integer,
ADD COLUMN IF NOT EXISTS profile_pic_hd_url text;

-- Create apify-scrapes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('apify-scrapes', 'apify-scrapes', false, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for apify-scrapes bucket
CREATE POLICY "Users can upload apify scrapes for their brand kits"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'apify-scrapes' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.brand_kits
    WHERE id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view apify scrapes for their brand kits"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'apify-scrapes' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.brand_kits
    WHERE id::text = (storage.foldername(name))[1]
    AND (user_id = auth.uid() OR is_brand_kit_member(id))
  )
);

CREATE POLICY "Users can delete apify scrapes for their brand kits"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'apify-scrapes' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.brand_kits
    WHERE id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);