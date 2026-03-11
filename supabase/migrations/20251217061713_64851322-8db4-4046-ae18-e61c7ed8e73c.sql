-- Create knowledge_files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge_files',
  'knowledge_files',
  true,
  5242880, -- 5MB in bytes
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for knowledge_files bucket
-- Allow authenticated users to view files in their brand kits
CREATE POLICY "Users can view knowledge files in their brand kits"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge_files' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if user has access to the brand kit
    EXISTS (
      SELECT 1 FROM brand_kit_members 
      WHERE brand_kit_id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM brand_kits 
      WHERE id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
    )
  )
);

-- Allow authenticated users to upload to their brand kits
CREATE POLICY "Users can upload knowledge files to their brand kits"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge_files'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM brand_kit_members 
      WHERE brand_kit_id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM brand_kits 
      WHERE id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
    )
  )
);

-- Allow authenticated users to update files in their brand kits
CREATE POLICY "Users can update knowledge files in their brand kits"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'knowledge_files'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM brand_kit_members 
      WHERE brand_kit_id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM brand_kits 
      WHERE id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
    )
  )
);

-- Allow authenticated users to delete files in their brand kits
CREATE POLICY "Users can delete knowledge files in their brand kits"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge_files'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM brand_kit_members 
      WHERE brand_kit_id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM brand_kits 
      WHERE id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
    )
  )
);