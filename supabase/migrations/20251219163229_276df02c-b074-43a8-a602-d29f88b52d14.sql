-- =============================================
-- MIGRATION: Secure Storage Buckets
-- =============================================

-- 1. FIX user_images BUCKET: Replace overly permissive SELECT policy
-- =============================================

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "User images are publicly accessible" ON storage.objects;

-- Allow users to view their own personal files (avatars, etc.)
CREATE POLICY "Users can view their own user files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user_images'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users with brand kit access to view brand kit files
CREATE POLICY "Users can view brand kit files with access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user_images'
  AND (storage.foldername(name))[1] = 'brand-kits'
  AND public.has_brand_kit_access(((storage.foldername(name))[2])::uuid, 'viewer')
);

-- 2. PROTECT brand-kit-os-website-assets BUCKET
-- =============================================

-- Allow public read access (for landing page assets)
CREATE POLICY "Website assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-kit-os-website-assets');

-- Only admins can insert website assets
CREATE POLICY "Only admins can insert website assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-kit-os-website-assets'
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update website assets
CREATE POLICY "Only admins can update website assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-kit-os-website-assets'
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete website assets
CREATE POLICY "Only admins can delete website assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-kit-os-website-assets'
  AND public.has_role(auth.uid(), 'admin')
);