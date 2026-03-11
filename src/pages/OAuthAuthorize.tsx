import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { useBrandKits } from '@/hooks/useBrandKits';
import { toast } from '@/hooks/useToast';
import { generateIntegrationIdentity, sha256Hex } from '@/lib/utils';

export function OAuthAuthorize() {
    const [searchParams] = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [clientName, setClientName] = useState('');
    const [error, setError] = useState('');
    const [selectedBrandKitIds, setSelectedBrandKitIds] = useState<string[]>([]);
    const [hasExistingIntegration, setHasExistingIntegration] = useState(false);
    const [checkedIntegration, setCheckedIntegration] = useState(false);

    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const state = searchParams.get('state');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');
    const external_workspace_id = searchParams.get('external_workspace_id');
    const external_user_id = searchParams.get('external_user_id');
    const scope = searchParams.get('scope') || 'brand_kit:read';

    const { brandKits, isLoading: brandKitsLoading } = useBrandKits();

    useEffect(() => {
        if (!authLoading && !user) {
            navigate(`/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (!external_workspace_id && !external_user_id) {
            setError('Either external_workspace_id or external_user_id is required');
            return;
        }

        if (!brandKitsLoading && clientId && !checkedIntegration) {
            if (brandKits && brandKits.length > 0) {
                const checkExistingIntegration = async () => {
                    const integrationIdentity = await generateIntegrationIdentity(clientId, external_user_id || undefined, external_workspace_id || undefined);
                    
                    const { data: integration } = await supabase
                        .from('partner_integrations')
                        .select('id')
                        .eq('client_id', clientId)
                        .eq('integration_identity', integrationIdentity)
                        .maybeSingle();
                    
                    setCheckedIntegration(true);
                    if (integration) {
                        setHasExistingIntegration(true);
                        handleAuthorize();
                    }
                };
                checkExistingIntegration();
                setError('');
            } else {
                setError('No brand kits found');
            }
        }
    }, [brandKits, brandKitsLoading, external_workspace_id, external_user_id, clientId, checkedIntegration]);


    useEffect(() => {
        if (clientId && redirectUri) {
            supabase
                .from('oauth_clients')
                .select('partner_name, redirect_uris')
                .eq('client_id', clientId)
                .eq('is_active', true)
                .single()
                .then(({ data, error }) => {
                    if (error || !data) {
                        setError('Invalid client');
                        return;
                    }
                    setClientName(data.partner_name || 'Unknown App');
                    
                    if (!data.redirect_uris.includes(redirectUri)) {
                        setError('Invalid redirect URI');
                    }
                });
        }
    }, [clientId, redirectUri]);

    const handleAuthorize = async () => {
        if (!clientId || !redirectUri) return;
        if (!hasExistingIntegration && selectedBrandKitIds.length === 0) return;

        if (!codeChallenge || !codeChallengeMethod) {
            toast({ title: 'Missing PKCE parameters', variant: 'destructive' });
            return;
        }

        if (isAuthorizing) return;
        setIsAuthorizing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data, response } = await supabase.functions.invoke('oauth-authorize', {
                body: {
                    client_id: clientId,
                    redirect_uri: encodeURIComponent(redirectUri),
                    state: state || '',
                    brand_kit_ids: selectedBrandKitIds.length > 0 ? selectedBrandKitIds : undefined,
                    code_challenge: codeChallenge,
                    code_challenge_method: codeChallengeMethod,
                    external_workspace_id,
                    external_user_id,
                    scope
                },
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            
            if (response.ok) {
                const code = data?.code;
                if (code) {
                    window.location.href = `${redirectUri}?code=${code}&state=${state || ''}`;
                }
            } else {
                const res = await response.json();
                toast({ title: res?.error?.message || 'Failed to authorize', variant: 'destructive' });
            }
        } catch (err) {
            toast({title: 'Authorization failed', variant: 'destructive'});
        } finally {
            setIsAuthorizing(false);
        }
    };

    if (authLoading || brandKitsLoading) return <FullScreenLoader />;
    if (!clientId || !redirectUri || !codeChallenge || !codeChallengeMethod) return <div className="flex h-screen items-center justify-center">Invalid request</div>;

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <CardTitle>Authorize {clientName}</CardTitle>
                    <CardDescription>
                        {clientName} wants to access your brand kit data with scope: {scope}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="space-y-2">
                        <Label>Select Brand Kits</Label>
                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                            {brandKits?.map((kit) => (
                                <div key={kit.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={kit.id}
                                        checked={selectedBrandKitIds.includes(kit.id)}
                                        disabled={!!error}
                                        onCheckedChange={(checked) => {
                                            setSelectedBrandKitIds(prev =>
                                                checked
                                                    ? [...prev, kit.id]
                                                    : prev.filter(id => id !== kit.id)
                                            )
                                        }}
                                    />
                                    <label htmlFor={kit.id} className="text-sm cursor-pointer">
                                        {kit.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={handleAuthorize} disabled={isAuthorizing || (!hasExistingIntegration && selectedBrandKitIds.length === 0) || !!error} className="w-full">
                        {isAuthorizing && <Loader size="sm" className="mr-2" />}
                        Authorize
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                        Cancel
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
