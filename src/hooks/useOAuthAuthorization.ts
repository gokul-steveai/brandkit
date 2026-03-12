import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OAuthParams } from './useOAuthParams';

interface AuthorizationOptions {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  externalWorkspaceId: string | null;
  externalUserId: string | null;
  scope: string;
  selectedBrandKitIds: string[];
}

interface AuthorizationResult {
  success: boolean;
  code?: string;
  error?: string;
}

async function performAuthorization(
  options: AuthorizationOptions
): Promise<AuthorizationResult> {
  const {
    clientId,
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
    externalWorkspaceId,
    externalUserId,
    scope,
    selectedBrandKitIds,
  } = options;

  const { data: { session } } = await supabase.auth.getSession();
  const { data, response } = await supabase.functions.invoke('oauth-authorize', {
    body: {
      client_id: clientId,
      redirect_uri: encodeURIComponent(redirectUri),
      state: state || '',
      brand_kit_ids: selectedBrandKitIds.length > 0 ? selectedBrandKitIds : undefined,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      external_workspace_id: externalWorkspaceId,
      external_user_id: externalUserId,
      scope,
    },
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });

  if (response.ok && data?.code) {
    return { success: true, code: data.code };
  }

  const res = await response.json();
  return { success: false, error: res?.error?.message || 'Failed to authorize' };
}

export function useOAuthAuthorization(oauthParams: OAuthParams) {
  const authorize = useCallback(
    async (selectedBrandKitIds: string[]): Promise<AuthorizationResult> => {
      return performAuthorization({
        clientId: oauthParams.clientId!,
        redirectUri: oauthParams.redirectUri!,
        state: oauthParams.state,
        codeChallenge: oauthParams.codeChallenge!,
        codeChallengeMethod: oauthParams.codeChallengeMethod!,
        externalWorkspaceId: oauthParams.externalWorkspaceId,
        externalUserId: oauthParams.externalUserId,
        scope: oauthParams.scope,
        selectedBrandKitIds,
      });
    },
    [oauthParams]
  );

  return { authorize };
}
