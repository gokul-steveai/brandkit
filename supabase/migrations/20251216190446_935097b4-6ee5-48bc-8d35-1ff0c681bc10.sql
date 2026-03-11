-- Step 1: Create a SECURITY DEFINER function to check brand kit membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_brand_kit_member(_brand_kit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM brand_kit_members 
    WHERE brand_kit_id = _brand_kit_id 
    AND user_id = auth.uid()
  )
$$;

-- Step 2: Drop and recreate the brand_kits SELECT policy to use the new function
DROP POLICY IF EXISTS "Users can view their own and shared brand kits" ON brand_kits;

CREATE POLICY "Users can view their own and shared brand kits"
ON brand_kits FOR SELECT
USING (
  (user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_brand_kit_member(id)
);

-- Step 3: Fix brand_kit_members SELECT policy - the current one uses has_brand_kit_access which causes recursion
DROP POLICY IF EXISTS "Owners can view brand kit members" ON brand_kit_members;

CREATE POLICY "Owners can view brand kit members"
ON brand_kit_members FOR SELECT
USING (
  -- Owner of the brand kit
  EXISTS (
    SELECT 1 FROM brand_kits 
    WHERE brand_kits.id = brand_kit_members.brand_kit_id 
    AND brand_kits.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  -- User is a member themselves
  OR (user_id = auth.uid())
);