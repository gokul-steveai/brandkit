import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OAuthParams } from './useOAuthParams';

interface ClientValidationResult {
  clientName: string;
  error: string | null;
}

export function useClientValidation(oauthParams: OAuthParams): ClientValidationResult {
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!oauthParams.clientId || !oauthParams.redirectUri) return;

    const fetchClientInfo = async () => {
      const { data, error: dbError } = await supabase
        .from('oauth_clients')
        .select('partner_name, redirect_uris')
        .eq('client_id', oauthParams.clientId)
        .eq('is_active', true)
        .single();

      if (dbError || !data) {
        setError('Invalid client');
        setClientName('Unknown App');
        return;
      }

      setClientName(data.partner_name || 'Unknown App');

      if (!data.redirect_uris.includes(oauthParams.redirectUri)) {
        setError('Invalid redirect URI');
      } else {
        setError(null);
      }
    };

    fetchClientInfo();
  }, [oauthParams.clientId, oauthParams.redirectUri]);

  return { clientName, error };
}
