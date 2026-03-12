import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateIntegrationIdentity } from '@/lib/utils';
import { OAuthParams } from './useOAuthParams';

interface IntegrationCheckResult {
  hasExisting: boolean;
  brandKitIds: string[];
  isChecked: boolean;
}

export function useIntegrationCheck(oauthParams: OAuthParams): IntegrationCheckResult {
  const [hasExisting, setHasExisting] = useState(false);
  const [brandKitIds, setBrandKitIds] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (!oauthParams.clientId || isChecked) return;

    const checkIntegration = async () => {
      const integrationIdentity = await generateIntegrationIdentity(
        oauthParams.clientId,
        oauthParams.externalUserId || undefined,
        oauthParams.externalWorkspaceId || undefined
      );

      const { data: integration } = await supabase
        .from('partner_integrations')
        .select('id')
        .eq('client_id', oauthParams.clientId)
        .eq('integration_identity', integrationIdentity)
        .maybeSingle();

      if (!integration) {
        setIsChecked(true);
        return;
      }

      const { data: brandKitMappings } = await supabase
        .from('partner_integration_brand_kits')
        .select('brand_kit_id')
        .eq('integration_id', integration.id);

      const ids = brandKitMappings?.map((m) => m.brand_kit_id) || [];
      setHasExisting(ids.length > 0);
      setBrandKitIds(ids);
      setIsChecked(true);
    };

    checkIntegration();
  }, [oauthParams.clientId, oauthParams.externalUserId, oauthParams.externalWorkspaceId, isChecked]);

  return { hasExisting, brandKitIds, isChecked };
}
