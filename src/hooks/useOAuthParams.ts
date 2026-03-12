import { useMemo } from 'react';

export interface OAuthParams {
  clientId: string | null;
  redirectUri: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  externalWorkspaceId: string | null;
  externalUserId: string | null;
  scope: string;
}

export function useOAuthParams(searchParams: URLSearchParams): OAuthParams {
  return useMemo(
    () => ({
      clientId: searchParams.get('client_id'),
      redirectUri: searchParams.get('redirect_uri'),
      state: searchParams.get('state'),
      codeChallenge: searchParams.get('code_challenge'),
      codeChallengeMethod: searchParams.get('code_challenge_method'),
      externalWorkspaceId: searchParams.get('external_workspace_id'),
      externalUserId: searchParams.get('external_user_id'),
      scope: searchParams.get('scope') || 'brand_kit:read',
    }),
    [searchParams]
  );
}
