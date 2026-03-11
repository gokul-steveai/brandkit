
-- Add per-partner API key columns to partner_integrations
ALTER TABLE public.partner_integrations
  ADD COLUMN IF NOT EXISTS key_hash TEXT,
  ADD COLUMN IF NOT EXISTS key_prefix TEXT;

-- Unique index on key_hash for fast lookups (only where set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_integrations_key_hash
  ON public.partner_integrations (key_hash)
  WHERE key_hash IS NOT NULL;
