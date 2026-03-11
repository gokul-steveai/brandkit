-- Add storage_path column to social_profiles table
ALTER TABLE social_profiles 
ADD COLUMN IF NOT EXISTS storage_path TEXT;