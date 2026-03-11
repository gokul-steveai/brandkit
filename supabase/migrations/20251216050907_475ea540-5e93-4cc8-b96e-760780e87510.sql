-- Phase 3 Security Fixes: Tighten RLS on brand_kit_categories

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view brand kit categories" ON public.brand_kit_categories;

-- Create a properly scoped SELECT policy that only allows users to see categories for their own brand kits
CREATE POLICY "Users can view their own brand kit categories" 
ON public.brand_kit_categories 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.brand_kits 
    WHERE brand_kits.id = brand_kit_categories.brand_kit_id 
    AND brand_kits.user_id = auth.uid()
  )
);

-- Also tighten INSERT policy to ensure users can only add categories to their own brand kits
DROP POLICY IF EXISTS "Users can add categories to their brand kits" ON public.brand_kit_categories;

CREATE POLICY "Users can add categories to their own brand kits" 
ON public.brand_kit_categories 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_kits 
    WHERE brand_kits.id = brand_kit_categories.brand_kit_id 
    AND brand_kits.user_id = auth.uid()
  )
);

-- Tighten DELETE policy similarly
DROP POLICY IF EXISTS "Users can remove categories from their brand kits" ON public.brand_kit_categories;

CREATE POLICY "Users can remove categories from their own brand kits" 
ON public.brand_kit_categories 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.brand_kits 
    WHERE brand_kits.id = brand_kit_categories.brand_kit_id 
    AND brand_kits.user_id = auth.uid()
  )
);