-- Phase 3: Brand Kit Access Control for Multi-User Collaboration

-- ============================================
-- CREATE BRAND KIT MEMBERS TABLE
-- ============================================

CREATE TABLE public.brand_kit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_kit_id, user_id)
);

-- Enable RLS
ALTER TABLE public.brand_kit_members ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX idx_brand_kit_members_brand_kit_id ON public.brand_kit_members(brand_kit_id);
CREATE INDEX idx_brand_kit_members_user_id ON public.brand_kit_members(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_brand_kit_members_updated_at
  BEFORE UPDATE ON public.brand_kit_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CREATE HELPER FUNCTION FOR ACCESS CHECKS
-- ============================================

CREATE OR REPLACE FUNCTION public.has_brand_kit_access(
  _brand_kit_id uuid,
  _required_role text DEFAULT 'viewer'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is the owner
    EXISTS (
      SELECT 1 FROM brand_kits 
      WHERE id = _brand_kit_id AND user_id = auth.uid()
    )
    OR
    -- User is an admin
    has_role(auth.uid(), 'admin')
    OR
    -- User is a member with sufficient role
    EXISTS (
      SELECT 1 FROM brand_kit_members 
      WHERE brand_kit_id = _brand_kit_id 
      AND user_id = auth.uid()
      AND (
        -- Role hierarchy: admin > editor > viewer
        CASE _required_role
          WHEN 'viewer' THEN role IN ('viewer', 'editor', 'admin')
          WHEN 'editor' THEN role IN ('editor', 'admin')
          WHEN 'admin' THEN role = 'admin'
          ELSE false
        END
      )
    )
$$;

-- ============================================
-- RLS POLICIES FOR BRAND_KIT_MEMBERS
-- ============================================

-- Owners and admins can view all members of their brand kits
CREATE POLICY "Owners can view brand kit members"
ON public.brand_kit_members
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);

-- Owners can add members to their brand kits
CREATE POLICY "Owners can add brand kit members"
ON public.brand_kit_members
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- Owners can update members of their brand kits
CREATE POLICY "Owners can update brand kit members"
ON public.brand_kit_members
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- Owners can remove members from their brand kits, members can remove themselves
CREATE POLICY "Owners can delete brand kit members"
ON public.brand_kit_members
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);

-- ============================================
-- UPDATE BRAND_KITS RLS TO INCLUDE MEMBERS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Viewers can view brand kits they have access to" ON public.brand_kits;

-- Create new policy that includes members
CREATE POLICY "Users can view their own and shared brand kits"
ON public.brand_kits
FOR SELECT
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM brand_kit_members 
    WHERE brand_kit_id = id AND user_id = auth.uid()
  )
);

-- Update the update policy to allow editors
DROP POLICY IF EXISTS "Authors can update their own brand kits" ON public.brand_kits;
CREATE POLICY "Owners and editors can update brand kits"
ON public.brand_kits
FOR UPDATE
USING (
  (user_id = auth.uid() AND (has_role(auth.uid(), 'author') OR has_role(auth.uid(), 'admin')))
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM brand_kit_members 
    WHERE brand_kit_id = id AND user_id = auth.uid() AND role IN ('editor', 'admin')
  )
)
WITH CHECK (
  (user_id = auth.uid() AND (has_role(auth.uid(), 'author') OR has_role(auth.uid(), 'admin')))
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM brand_kit_members 
    WHERE brand_kit_id = id AND user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);