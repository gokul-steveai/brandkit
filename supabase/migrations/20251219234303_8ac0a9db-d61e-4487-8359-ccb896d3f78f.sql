
-- =============================================
-- KNOWLEDGE_FILES BUCKET - Authenticated read access
-- =============================================

-- Drop existing SELECT policy that requires brand kit access
DROP POLICY IF EXISTS "Users can view knowledge files in their brand kits" ON storage.objects;

-- Create new SELECT policy - any authenticated user can read
CREATE POLICY "Authenticated users can view knowledge files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge_files');

-- =============================================
-- USER_IMAGES BUCKET - Keep public, add user-based write policies
-- =============================================

-- Drop existing overlapping policies for user_images
DROP POLICY IF EXISTS "Users can delete brand kit files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete user files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update brand kit files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update user files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload brand kit files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload user files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view brand kit files with access" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own user files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view user images" ON storage.objects;

-- SELECT: Anyone can view (bucket is public)
CREATE POLICY "Public read access for user images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user_images');

-- INSERT: Users can only upload to paths starting with their user_id
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Users can only update their own files
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Users can only delete their own files
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
