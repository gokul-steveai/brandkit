-- Drop existing storage policies for user_images bucket that conflict with new structure
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- =====================================================
-- USER FILES: users/{userId}/*
-- For personal files like avatars
-- =====================================================

-- INSERT: Users can upload their own user files
CREATE POLICY "Users can upload user files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- UPDATE: Users can update their own user files
CREATE POLICY "Users can update user files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- DELETE: Users can delete their own user files
CREATE POLICY "Users can delete user files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- =====================================================
-- BRAND KIT FILES: brand-kits/{brandKitId}/{userId}/*
-- For brand assets where userId tracks who uploaded
-- =====================================================

-- INSERT: Users with editor access can upload brand kit files
CREATE POLICY "Users can upload brand kit files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'brand-kits'
  AND has_brand_kit_access((storage.foldername(name))[2]::uuid, 'editor')
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- UPDATE: Users with editor access can update brand kit files
CREATE POLICY "Users can update brand kit files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'brand-kits'
  AND has_brand_kit_access((storage.foldername(name))[2]::uuid, 'editor')
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- DELETE: Users with editor access can delete brand kit files
CREATE POLICY "Users can delete brand kit files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'brand-kits'
  AND has_brand_kit_access((storage.foldername(name))[2]::uuid, 'editor')
  AND (storage.foldername(name))[3] = auth.uid()::text
);