-- Create user_images storage bucket for user avatars and profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_images', 'user_images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to user images (for avatars to display)
CREATE POLICY "User images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'user_images');