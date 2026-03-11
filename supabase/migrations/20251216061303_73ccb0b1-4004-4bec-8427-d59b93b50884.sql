-- Create bonus_redemptions table to track awarded bonuses
CREATE TABLE public.bonus_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bonus_type TEXT NOT NULL,
  tokens_awarded INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_bonus UNIQUE (user_id, bonus_type)
);

-- Enable RLS
ALTER TABLE public.bonus_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own bonus redemptions
CREATE POLICY "Users can view their own bonuses"
  ON public.bonus_redemptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert bonuses
CREATE POLICY "Service role can manage bonuses"
  ON public.bonus_redemptions
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for faster lookups
CREATE INDEX idx_bonus_redemptions_user_id ON public.bonus_redemptions(user_id);

-- Add comment
COMMENT ON TABLE public.bonus_redemptions IS 'Tracks one-time bonus token awards to prevent duplicate redemptions';