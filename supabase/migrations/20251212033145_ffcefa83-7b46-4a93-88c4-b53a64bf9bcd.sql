-- Add auto_save preference to profiles table (default true)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_save boolean DEFAULT true;