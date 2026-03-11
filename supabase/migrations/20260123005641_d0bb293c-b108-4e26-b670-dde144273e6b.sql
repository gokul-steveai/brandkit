-- Create messaging_framework_specs table for storing versioned generated specs
CREATE TABLE public.messaging_framework_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  selected_frameworks JSONB NOT NULL DEFAULT '[]'::jsonb,
  selection_method TEXT NOT NULL DEFAULT 'manual' CHECK (selection_method IN ('manual', 'ai_recommended')),
  content_markdown TEXT NOT NULL,
  content_json JSONB,
  generation_config JSONB DEFAULT '{}'::jsonb,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_messaging_framework_specs_brand_kit ON public.messaging_framework_specs(brand_kit_id);
CREATE INDEX idx_messaging_framework_specs_user ON public.messaging_framework_specs(user_id);

-- Create unique constraint for version per brand kit (auto-increment simulation)
CREATE UNIQUE INDEX idx_messaging_framework_specs_version ON public.messaging_framework_specs(brand_kit_id, version);

-- Enable RLS
ALTER TABLE public.messaging_framework_specs ENABLE ROW LEVEL SECURITY;

-- Users can view specs for brand kits they have access to
CREATE POLICY "Users can view messaging framework specs"
ON public.messaging_framework_specs
FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

-- Users can create specs for brand kits they can edit
CREATE POLICY "Users can create messaging framework specs"
ON public.messaging_framework_specs
FOR INSERT
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- Users can update their own specs
CREATE POLICY "Users can update their own specs"
ON public.messaging_framework_specs
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own specs
CREATE POLICY "Users can delete their own specs"
ON public.messaging_framework_specs
FOR DELETE
USING (user_id = auth.uid());

-- Create function to get next version number
CREATE OR REPLACE FUNCTION public.get_next_messaging_framework_version(p_brand_kit_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM messaging_framework_specs
  WHERE brand_kit_id = p_brand_kit_id;
$$;