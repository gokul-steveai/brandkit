-- Add post_storage_path column to social_profiles table
ALTER TABLE public.social_profiles 
ADD COLUMN IF NOT EXISTS post_storage_path text;

COMMENT ON COLUMN public.social_profiles.post_storage_path IS 
  'Storage path for the posts JSON file in apify-scrapes bucket';

-- Add signed_url_expiry_months column to profiles table for user preferences
-- Default is 12 months (1 year)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signed_url_expiry_months integer DEFAULT 12;

COMMENT ON COLUMN public.profiles.signed_url_expiry_months IS 
  'Default expiration time in months for signed URLs. Default is 12 (1 year)';