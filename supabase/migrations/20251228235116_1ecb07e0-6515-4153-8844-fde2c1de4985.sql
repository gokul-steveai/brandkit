-- Create storage bucket for social profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social-profile-images', 'social-profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public can view social profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-profile-images');

-- Allow authenticated users to upload images (via edge function with service role)
CREATE POLICY "Service role can upload social profile images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-profile-images');

-- Allow authenticated users to update images
CREATE POLICY "Service role can update social profile images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'social-profile-images');

-- Allow authenticated users to delete images
CREATE POLICY "Service role can delete social profile images"
ON storage.objects FOR DELETE
USING (bucket_id = 'social-profile-images');