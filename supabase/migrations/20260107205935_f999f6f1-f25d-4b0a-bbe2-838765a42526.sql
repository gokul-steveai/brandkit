-- Add columns to track data source and soft-delete status for social profiles
ALTER TABLE public.social_profiles 
ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';

ALTER TABLE public.social_profiles 
ADD COLUMN IF NOT EXISTS is_disconnected boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.social_profiles.data_source IS 'Source of profile data: manual, apify, n8n';
COMMENT ON COLUMN public.social_profiles.is_disconnected IS 'Soft-delete flag - true means user disconnected but data is preserved';

-- Create index for efficient filtering of connected profiles
CREATE INDEX IF NOT EXISTS idx_social_profiles_is_disconnected 
ON public.social_profiles (is_disconnected) 
WHERE is_disconnected = false;