import { supabase } from '@/integrations/supabase/client';
import { sha256Hex } from '@/lib/utils';

export interface CreateIntegrationData {
  client_id: string;
  user_id: string;
  external_user_id?: string;
  external_workspace_id?: string;
  webhook_url?: string;
}

export const createPartnerIntegration = async (data: CreateIntegrationData) => {
  const { data: clientData, error: clientError } = await supabase
    .from('oauth_clients')
    .select('client_id, partner_name')
    .eq('client_id', data.client_id)
    .eq('is_active', true)
    .single();

  if (clientError || !clientData) throw new Error('Invalid OAuth client');

  const webhookSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  
  const identityParts = [data.client_id];
  if (data.external_user_id) identityParts.push(data.external_user_id);
  if (data.external_workspace_id) identityParts.push(data.external_workspace_id);

  const integrationIdentity = await sha256Hex(identityParts.join(':'));

  const { data: integration, error } = await supabase
    .from('partner_integrations')
    .upsert({
      brand_kit_id: null,
      client_id: clientData.client_id,
      integration_identity: integrationIdentity,
      user_id: data.user_id,
      partner_name: clientData.partner_name,
      external_user_id: data.external_user_id || null,
      external_workspace_id: data.external_workspace_id || null,
      webhook_url: data.webhook_url || null,
      webhook_secret: webhookSecret,
      is_active: true,
    }, { onConflict: 'integration_identity,client_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return integration;
};

export const linkBrandKitsToIntegration = async (integrationId: string, brandKitIds: string[]) => {
  const records = brandKitIds.map(brandKitId => ({
    integration_id: integrationId,
    brand_kit_id: brandKitId
  }));

  const { error } = await supabase
    .from('partner_integration_brand_kits')
    .upsert(records, { onConflict: 'integration_id,brand_kit_id' });

  if (error) throw error;
};