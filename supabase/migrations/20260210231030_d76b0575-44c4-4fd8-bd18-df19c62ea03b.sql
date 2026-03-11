
-- Add version column to brand_kits
ALTER TABLE public.brand_kits
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION public.increment_brand_kit_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_brand_kit_version
BEFORE UPDATE ON public.brand_kits
FOR EACH ROW
EXECUTE FUNCTION public.increment_brand_kit_version();

-- ============================================
-- partner_integrations
-- ============================================
CREATE TABLE public.partner_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  partner_name text NOT NULL DEFAULT 'leafpad',
  external_user_id text,
  external_workspace_id text,
  webhook_url text,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integrations"
ON public.partner_integrations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_partner_integrations_updated_at
BEFORE UPDATE ON public.partner_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- webhook_events
-- ============================================
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook events"
ON public.webhook_events FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service role can insert webhook events"
ON public.webhook_events FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- webhook_deliveries
-- ============================================
CREATE TABLE public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.partner_integrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  response_status integer,
  response_body text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook deliveries"
ON public.webhook_deliveries FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage webhook deliveries"
ON public.webhook_deliveries FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER update_webhook_deliveries_updated_at
BEFORE UPDATE ON public.webhook_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for common queries
CREATE INDEX idx_partner_integrations_brand_kit ON public.partner_integrations(brand_kit_id);
CREATE INDEX idx_partner_integrations_external_user ON public.partner_integrations(external_user_id) WHERE external_user_id IS NOT NULL;
CREATE INDEX idx_partner_integrations_external_workspace ON public.partner_integrations(external_workspace_id) WHERE external_workspace_id IS NOT NULL;
CREATE INDEX idx_webhook_events_brand_kit ON public.webhook_events(brand_kit_id);
CREATE INDEX idx_webhook_deliveries_event ON public.webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status) WHERE status = 'pending';
