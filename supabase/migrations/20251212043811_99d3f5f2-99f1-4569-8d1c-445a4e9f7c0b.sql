-- Rename tag to tags and convert to text array in library_brand_principles
ALTER TABLE public.library_brand_principles 
  ALTER COLUMN tag TYPE text[] USING CASE WHEN tag IS NOT NULL THEN ARRAY[tag] ELSE '{}'::text[] END;

ALTER TABLE public.library_brand_principles 
  RENAME COLUMN tag TO tags;