import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { useClipboard, useOAuthClients, useIntegrationCount } from '@/hooks/useOAuth';
import { ClientCard, CredentialsDisplay, CreateClientDialog, EditUriDialog } from './index';

interface OAuthClient {
  id: string;
  client_id: string;
  partner_name: string;
  redirect_uris: string[];
  created_at: string;
}

interface Props {
  clients: OAuthClient[];
  onReload: () => void;
  openCreateDialog?: boolean;
  setOpenCreateDialog?: (open: boolean) => void;
}

interface NewCredentials {
  client_id: string;
  client_secret: string;
  partner_name: string;
}

export function OAuthClientsList({ clients, onReload, openCreateDialog, setOpenCreateDialog }: Props) {
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<OAuthClient | null>(null);
  const [clientToEdit, setClientToEdit] = useState<OAuthClient | null>(null);
  const [newCredentials, setNewCredentials] = useState<NewCredentials | null>(null);
  
  const { copyToClipboard } = useClipboard();
  const { deleteClient } = useOAuthClients(false);
  const { data: integrationCount = 0 } = useIntegrationCount(clientToDelete?.client_id || null);

  useEffect(() => {
    if (openCreateDialog) {
      setOpen(true);
      setOpenCreateDialog?.(false);
    }
  }, [openCreateDialog, setOpenCreateDialog]);

  const handleEditClick = (client: OAuthClient) => {
    setClientToEdit(client);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (client: OAuthClient) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      await deleteClient(clientToDelete.id);
      onReload();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <>
      {newCredentials && (
        <CredentialsDisplay
          credentials={newCredentials}
          onDismiss={() => setNewCredentials(null)}
          onCopy={copyToClipboard}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">OAuth Clients</h2>
          <p className="text-muted-foreground">Manage OAuth client applications</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Client
        </Button>
      </div>

      <div className="grid gap-4">
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onCopy={copyToClipboard}
          />
        ))}
        
        {!clients.length && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No OAuth clients yet</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Client
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateClientDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={(credentials) => {
          setNewCredentials(credentials);
          onReload();
        }}
      />

      <EditUriDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={clientToEdit}
        onSuccess={onReload}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OAuth Client?</AlertDialogTitle>
            <AlertDialogDescription>
              {integrationCount > 0 ? (
                <>
                  This client has <strong>{integrationCount}</strong> active integration{integrationCount > 1 ? 's' : ''}.
                  Deleting will revoke all access tokens. This action cannot be undone.
                </>
              ) : (
                <>Are you sure? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}