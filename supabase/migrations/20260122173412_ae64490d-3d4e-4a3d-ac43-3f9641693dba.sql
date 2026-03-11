-- Allow users to view profiles of members in their shared brand kits
CREATE POLICY "Users can view profiles of brand kit co-members"
ON public.profiles FOR SELECT
USING (
  -- User can always see their own profile
  id = auth.uid()
  OR
  -- User can see profiles of people they share brand kits with
  EXISTS (
    SELECT 1 FROM brand_kit_members bkm1
    JOIN brand_kit_members bkm2 ON bkm1.brand_kit_id = bkm2.brand_kit_id
    WHERE bkm1.user_id = auth.uid()
    AND bkm2.user_id = profiles.id
  )
  OR
  -- Brand kit owners can see profiles of their members
  EXISTS (
    SELECT 1 FROM brand_kits bk
    JOIN brand_kit_members bkm ON bk.id = bkm.brand_kit_id
    WHERE bk.user_id = auth.uid()
    AND bkm.user_id = profiles.id
  )
  OR
  -- Members can see the owner's profile
  EXISTS (
    SELECT 1 FROM brand_kit_members bkm
    JOIN brand_kits bk ON bkm.brand_kit_id = bk.id
    WHERE bkm.user_id = auth.uid()
    AND bk.user_id = profiles.id
  )
);