-- Create social_profiles table for storing social media profile data
CREATE TABLE public.social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'reddit')),
  profile_type TEXT NOT NULL CHECK (profile_type IN ('personal', 'company')),
  profile_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error')),
  
  -- Basic profile info
  first_name TEXT,
  last_name TEXT,
  headline TEXT,
  about TEXT,
  
  -- Current role info
  job_title TEXT,
  company_name TEXT,
  company_website TEXT,
  
  -- Stats
  connections INTEGER,
  followers INTEGER,
  is_influencer BOOLEAN DEFAULT false,
  
  -- Complex data as JSONB
  skills JSONB DEFAULT '[]'::jsonb,
  experiences JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  recommendations_given JSONB DEFAULT '[]'::jsonb,
  interests JSONB DEFAULT '[]'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  verifications JSONB DEFAULT '[]'::jsonb,
  
  -- Media URLs
  profile_image_url TEXT,
  logo_url TEXT,
  
  -- Store full response for future schema changes
  raw_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one profile per platform per type per brand kit
  UNIQUE(brand_kit_id, platform, profile_type)
);

-- Create user_feedback table for collecting user feedback
CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_profiles
CREATE POLICY "Users can view social profiles via brand kit access"
ON public.social_profiles
FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify social profiles via brand kit access"
ON public.social_profiles
FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- RLS policies for user_feedback
CREATE POLICY "Users can insert their own feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own feedback"
ON public.user_feedback
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on social_profiles
CREATE TRIGGER update_social_profiles_updated_at
BEFORE UPDATE ON public.social_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();