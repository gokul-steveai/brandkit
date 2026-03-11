-- Create brand_kit_invitations table for invitation links
CREATE TABLE public.brand_kit_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer',
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX idx_brand_kit_invitations_token ON public.brand_kit_invitations(token);
CREATE INDEX idx_brand_kit_invitations_brand_kit ON public.brand_kit_invitations(brand_kit_id);

-- Enable RLS
ALTER TABLE public.brand_kit_invitations ENABLE ROW LEVEL SECURITY;

-- Owners/admins can manage invitations for their brand kits
CREATE POLICY "Owners can manage invitations"
  ON public.brand_kit_invitations FOR ALL
  USING (has_brand_kit_access(brand_kit_id, 'admin'))
  WITH CHECK (has_brand_kit_access(brand_kit_id, 'admin'));

-- Anyone can read invitation details by token (for sign-up page validation)
CREATE POLICY "Public can read invitations by token"
  ON public.brand_kit_invitations FOR SELECT
  USING (true);