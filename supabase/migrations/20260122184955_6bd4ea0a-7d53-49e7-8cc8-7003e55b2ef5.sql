-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;

-- Create new INSERT policy that supports both path patterns
CREATE POLICY "Users can upload images to allowed paths"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user_images'
  AND (
    -- Pattern 1: users/{userId}/... - first folder is user ID
    (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR
    -- Pattern 2: brand-kits/{brandKitId}/{userId}/... 
    -- third folder must be user ID AND user must have brand kit access
    (
      (storage.foldername(name))[1] = 'brand-kits'
      AND (storage.foldername(name))[3] = auth.uid()::text
      AND public.has_brand_kit_access((storage.foldername(name))[2]::uuid, 'editor')
    )
    OR
    -- Pattern 3: support-tickets/{userId}/... - second folder is user ID
    (
      (storage.foldername(name))[1] = 'support-tickets'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- Also update UPDATE policy for brand kit files
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

CREATE POLICY "Users can update images in allowed paths"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user_images'
  AND (
    -- Pattern 1: users/{userId}/...
    (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR
    -- Pattern 2: brand-kits/{brandKitId}/{userId}/...
    (
      (storage.foldername(name))[1] = 'brand-kits'
      AND (storage.foldername(name))[3] = auth.uid()::text
      AND public.has_brand_kit_access((storage.foldername(name))[2]::uuid, 'editor')
    )
    OR
    -- Pattern 3: support-tickets/{userId}/...
    (
      (storage.foldername(name))[1] = 'support-tickets'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- Also update DELETE policy for brand kit files
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

CREATE POLICY "Users can delete images in allowed paths"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user_images'
  AND (
    -- Pattern 1: users/{userId}/...
    (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR
    -- Pattern 2: brand-kits/{brandKitId}/{userId}/...
    (
      (storage.foldername(name))[1] = 'brand-kits'
      AND (storage.foldername(name))[3] = auth.uid()::text
      AND public.has_brand_kit_access((storage.foldername(name))[2]::uuid, 'editor')
    )
    OR
    -- Pattern 3: support-tickets/{userId}/...
    (
      (storage.foldername(name))[1] = 'support-tickets'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);