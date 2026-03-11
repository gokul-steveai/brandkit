-- Create the consolidated industry classifications table
CREATE TABLE public.industry_classifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    level text NOT NULL CHECK (level IN ('industry', 'subindustry', 'sector')),
    parent_id uuid REFERENCES public.industry_classifications(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT valid_hierarchy CHECK (
        (level = 'industry' AND parent_id IS NULL) OR
        (level IN ('subindustry', 'sector') AND parent_id IS NOT NULL)
    )
);

-- Create index for faster parent lookups
CREATE INDEX idx_industry_classifications_parent ON public.industry_classifications(parent_id);
CREATE INDEX idx_industry_classifications_level ON public.industry_classifications(level);

-- Enable RLS
ALTER TABLE public.industry_classifications ENABLE ROW LEVEL SECURITY;

-- Read-only access for everyone
CREATE POLICY "Anyone can view industry classifications"
ON public.industry_classifications
FOR SELECT
USING (true);

-- Update brand_kit_core: remove old columns, add new reference
ALTER TABLE public.brand_kit_core 
DROP COLUMN IF EXISTS industry_id,
DROP COLUMN IF EXISTS subindustry_id,
DROP COLUMN IF EXISTS sector_id;

ALTER TABLE public.brand_kit_core 
ADD COLUMN industry_classification_id uuid REFERENCES public.industry_classifications(id);

-- Drop old tables
DROP TABLE IF EXISTS public.sectors;
DROP TABLE IF EXISTS public.subindustries;
DROP TABLE IF EXISTS public.industries;