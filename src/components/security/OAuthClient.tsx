import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Shield } from 'lucide-react';
import { OAuthClientsList } from './OAuthClientsList';
import { AccessTokensList } from './AccessTokensList';
import { useOAuthClients, useAccessTokens } from '@/hooks/useOAuth';
import { CenteredLoader } from '@/components/ui/loader';

export function OAuthClient() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [dialogTriggered, setDialogTriggered] = useState(false);

  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useOAuthClients(!!user);
  const { data: tokens = [], isLoading: tokensLoading, refetch: refetchTokens } = useAccessTokens(!!user);

  useEffect(() => {
    if (searchParams.get('create') === 'true' && !dialogTriggered) {
      setOpenCreateDialog(true);
      setDialogTriggered(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, dialogTriggered]);

  if (clientsLoading) {
    return <CenteredLoader />;
  }

  return (
    <Tabs defaultValue="clients" className="space-y-4">
      <TabsList>
        <TabsTrigger value="clients">
          <Key className="h-4 w-4 mr-2" />
          OAuth Clients
        </TabsTrigger>
        <TabsTrigger value="tokens">
          <Shield className="h-4 w-4 mr-2" />
          Access Tokens
        </TabsTrigger>
      </TabsList>

      <TabsContent value="clients">
        <OAuthClientsList 
          clients={clients} 
          onReload={refetchClients} 
          openCreateDialog={openCreateDialog}
          setOpenCreateDialog={setOpenCreateDialog}
        />
      </TabsContent>

      <TabsContent value="tokens">
        <AccessTokensList 
          tokens={tokens} 
          loading={tokensLoading} 
          onReload={refetchTokens} 
        />
      </TabsContent>
    </Tabs>
  );
}