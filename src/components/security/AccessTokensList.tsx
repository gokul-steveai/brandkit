import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { CenteredLoader } from '@/components/ui/loader';
import { supabase } from '@/integrations/supabase/client';

interface AccessToken {
  id: string;
  access_token_hash: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  refresh_token: {
    partner_integration: {
      client_id: string;
      integration_identity: string;
      oauth_client: {
        partner_name: string;
      };
    };
  };
}

interface Props {
  tokens: AccessToken[];
  loading: boolean;
  onReload: () => void;
}

export function AccessTokensList({ tokens, loading, onReload }: Props) {
  const revokeToken = async (id: string) => {
    const { error } = await supabase
      .from('oauth_access_tokens')
      .update({ revoked: true })
      .eq('id', id);
    
    if (!error) {
      toast({ title: 'Token revoked' });
      onReload();
    } else {
      toast({ title: 'Failed to revoke token', variant: 'destructive' });
    }
  };

  if (loading) {
    return <CenteredLoader />;
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Access Tokens</h2>
          <p className="text-muted-foreground">View and revoke active OAuth access tokens</p>
        </div>
      </div>

      <div className="grid gap-4">
        {tokens.map((token) => {
          const isExpired = new Date(token.expires_at) < new Date();
          const isActive = !token.revoked && !isExpired;
          const partnerName = token.refresh_token?.partner_integration?.oauth_client?.partner_name || 'Unknown';
          const clientId = token.refresh_token?.partner_integration?.client_id || 'N/A';

          return (
            <Card key={token.id} className={!isActive ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{partnerName}</CardTitle>
                      {isActive && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>}
                      {token.revoked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Revoked</span>}
                      {isExpired && !token.revoked && <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Expired</span>}
                    </div>
                    <CardDescription>
                      Created {new Date(token.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  {isActive && (
                    <Button variant="ghost" size="sm" onClick={() => revokeToken(token.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Client ID</Label>
                  <div className="text-sm bg-muted p-2 rounded mt-1">{clientId}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Expires At</Label>
                    <div className="text-sm mt-1">{new Date(token.expires_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Token Hash</Label>
                    <div className="text-sm mt-1 font-mono truncate">{token.access_token_hash.substring(0, 16)}...</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {tokens.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No access tokens found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
