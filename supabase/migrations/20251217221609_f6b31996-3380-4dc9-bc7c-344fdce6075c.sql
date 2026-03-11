-- Storage RLS policies for user-knowledge-files bucket

-- INSERT: Users can upload files to their folders within brand kits they can edit
CREATE POLICY "Users can upload their knowledge files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-knowledge-files'
  AND auth.uid() IS NOT NULL
  AND has_brand_kit_access((storage.foldername(name))[1]::uuid, 'editor')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- SELECT: Users can view files in brand kits they have access to
CREATE POLICY "Users can view their knowledge files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-knowledge-files'
  AND auth.uid() IS NOT NULL
  AND has_brand_kit_access((storage.foldername(name))[1]::uuid, 'viewer')
);

-- UPDATE: Users can update their own files in brand kits they can edit
CREATE POLICY "Users can update their knowledge files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-knowledge-files'
  AND auth.uid() IS NOT NULL
  AND has_brand_kit_access((storage.foldername(name))[1]::uuid, 'editor')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- DELETE: Users can delete their own files in brand kits they can edit
CREATE POLICY "Users can delete their knowledge files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-knowledge-files'
  AND auth.uid() IS NOT NULL
  AND has_brand_kit_access((storage.foldername(name))[1]::uuid, 'editor')
  AND (storage.foldername(name))[2] = auth.uid()::text
);