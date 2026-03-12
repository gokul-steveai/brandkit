import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandKits } from '@/hooks/useBrandKits';
import { toast } from '@/hooks/useToast';
import { useOAuthParams } from '@/hooks/useOAuthParams';
import { useClientValidation } from '@/hooks/useClientValidation';
import { useIntegrationCheck } from '@/hooks/useIntegrationCheck';
import { useOAuthAuthorization } from '@/hooks/useOAuthAuthorization';
import { BrandKitSelection } from '@/components/security/BrandKitSelection';


export function OAuthAuthorize() {
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [selectedBrandKitIds, setSelectedBrandKitIds] = useState<string[]>([]);
  const [showBrandKitSelection, setShowBrandKitSelection] = useState(true);

  const oauthParams = useOAuthParams(searchParams);
  const { brandKits, isLoading: brandKitsLoading } = useBrandKits();
  const { clientName, error: clientError } = useClientValidation(oauthParams);
  const { hasExisting, brandKitIds, isChecked } = useIntegrationCheck(oauthParams);
  const { authorize } = useOAuthAuthorization(oauthParams);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(
        `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (hasExisting && brandKitIds.length > 0) {
      setSelectedBrandKitIds(brandKitIds);
      setShowBrandKitSelection(false);
    }
  }, [hasExisting, brandKitIds]);

  useEffect(() => {
    if (hasExisting && !showBrandKitSelection && selectedBrandKitIds.length > 0) {
      handleAuthorize();
    }
  }, [hasExisting, showBrandKitSelection, selectedBrandKitIds]);

  const handleBrandKitToggle = useCallback((kitId: string, checked: boolean) => {
    setSelectedBrandKitIds((prev) =>
      checked ? [...prev, kitId] : prev.filter((id) => id !== kitId)
    );
  }, []);

  const handleAuthorize = useCallback(async () => {
    if (!oauthParams.clientId || !oauthParams.redirectUri) return;
    if (!hasExisting && selectedBrandKitIds.length === 0) return;

    if (!oauthParams.codeChallenge || !oauthParams.codeChallengeMethod) {
      toast({ title: 'Missing PKCE parameters', variant: 'destructive' });
      return;
    }

    if (isAuthorizing) return;
    setIsAuthorizing(true);

    try {
      const result = await authorize(selectedBrandKitIds);

      if (result.success && result.code) {
        window.location.href = `${oauthParams.redirectUri}?code=${result.code}&state=${oauthParams.state || ''}`;
      } else {
        toast({ title: result.error || 'Failed to authorize', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Authorization failed', variant: 'destructive' });
    } finally {
      setIsAuthorizing(false);
    }
  }, [oauthParams, hasExisting, selectedBrandKitIds, isAuthorizing, authorize]);

  const isLoading = authLoading || brandKitsLoading || !isChecked;

  const isInvalidRequest =
    !oauthParams.clientId ||
    !oauthParams.redirectUri ||
    !oauthParams.codeChallenge ||
    !oauthParams.codeChallengeMethod;

  const isAuthorizeDisabled =
    isAuthorizing || (!hasExisting && selectedBrandKitIds.length === 0) || !!clientError;

  if (isLoading || (hasExisting && !showBrandKitSelection)) {
    return <FullScreenLoader />;
  }

  if (isInvalidRequest) {
    return <div className="flex h-screen items-center justify-center">Invalid request</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Authorize {clientName}</CardTitle>
          <CardDescription>
            {clientName} wants to access your brand kit data with scope: {oauthParams.scope}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientError && <p className="text-sm text-destructive">{clientError}</p>}
          {showBrandKitSelection && (
            <BrandKitSelection
              brandKits={brandKits || []}
              selectedIds={selectedBrandKitIds}
              onToggle={handleBrandKitToggle}
              disabled={!!clientError}
            />
          )}
          <Button onClick={handleAuthorize} disabled={isAuthorizeDisabled} className="w-full">
            {isAuthorizing && <Loader size="sm" className="mr-2" />}
            Authorize
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
