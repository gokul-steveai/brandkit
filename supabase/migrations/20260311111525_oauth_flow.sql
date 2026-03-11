-- Create oauth_clients table
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  allowed_scopes TEXT[] NOT NULL DEFAULT '{"brand_kit:read"}',
  scopes TEXT[] NOT NULL DEFAULT '{"brand_kit:read"}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oauth_clients_partner_name ON oauth_clients(partner_name);

-- Modify partner_integrations table
ALTER TABLE partner_integrations 
ADD COLUMN client_id TEXT REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
ADD COLUMN integration_identity TEXT,
ALTER COLUMN brand_kit_id DROP NOT NULL;

CREATE UNIQUE INDEX idx_partner_integrations_client_identity 
ON partner_integrations(client_id, integration_identity);

CREATE INDEX idx_partner_integrations_client_id ON partner_integrations(client_id);

-- Create oauth_refresh_tokens table
CREATE TABLE oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refresh_token_hash TEXT UNIQUE NOT NULL,
  partner_integration_id UUID NOT NULL REFERENCES partner_integrations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oauth_refresh_tokens_hash ON oauth_refresh_tokens(refresh_token_hash) WHERE revoked = false;
CREATE INDEX idx_oauth_refresh_tokens_integration_id ON oauth_refresh_tokens(partner_integration_id);

ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage refresh tokens" ON oauth_refresh_tokens FOR ALL USING (true);

-- Create oauth_codes table
CREATE TABLE oauth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  partner_integration_id UUID NOT NULL REFERENCES partner_integrations(id) ON DELETE CASCADE,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  scopes TEXT[] NOT NULL DEFAULT '{"brand_kit:read"}',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oauth_codes_client_id ON oauth_codes(client_id);
CREATE INDEX idx_oauth_codes_integration_id ON oauth_codes(partner_integration_id);

ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage oauth codes" ON oauth_codes FOR ALL USING (true);

-- Create oauth_access_tokens table
CREATE TABLE oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_hash TEXT UNIQUE NOT NULL,
  refresh_token_id UUID NOT NULL REFERENCES oauth_refresh_tokens(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{"brand_kit:read"}',
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oauth_access_tokens_refresh_token_id ON oauth_access_tokens(refresh_token_id);
CREATE INDEX idx_oauth_access_tokens_scopes ON oauth_access_tokens USING GIN(scopes);

ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage access tokens" ON oauth_access_tokens FOR ALL USING (true);

-- Create partner_integration_brand_kits junction table
CREATE TABLE partner_integration_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES partner_integrations(id) ON DELETE CASCADE,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(integration_id, brand_kit_id)
);

CREATE INDEX idx_partner_integration_brand_kits_integration_id ON partner_integration_brand_kits(integration_id);
CREATE INDEX idx_partner_integration_brand_kits_brand_kit_id ON partner_integration_brand_kits(brand_kit_id);

ALTER TABLE partner_integration_brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integration brand kits" ON partner_integration_brand_kits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM partner_integrations WHERE partner_integrations.id = integration_id AND partner_integrations.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own integration brand kits" ON partner_integration_brand_kits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM partner_integrations WHERE partner_integrations.id = integration_id AND partner_integrations.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own integration brand kits" ON partner_integration_brand_kits
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM partner_integrations WHERE partner_integrations.id = integration_id AND partner_integrations.user_id = auth.uid())
  );
