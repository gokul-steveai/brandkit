-- Allow users to read apify scrapes for brand kits they have access to
CREATE POLICY "Users can read apify scrapes for their brand kits"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'apify-scrapes'
  AND auth.uid() IS NOT NULL
  AND (
    -- User owns the brand kit
    EXISTS (
      SELECT 1 FROM brand_kits
      WHERE brand_kits.id = (storage.foldername(objects.name))[1]::uuid
      AND brand_kits.user_id = auth.uid()
    )
    OR
    -- User is a member of the brand kit
    EXISTS (
      SELECT 1 FROM brand_kit_members
      WHERE brand_kit_members.brand_kit_id = (storage.foldername(objects.name))[1]::uuid
      AND brand_kit_members.user_id = auth.uid()
    )
  )
);