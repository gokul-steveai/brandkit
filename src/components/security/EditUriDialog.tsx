import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOAuthClients } from '@/hooks/useOAuth';
import { UriManager } from './index';
import { Loader } from '@/components/ui/loader';

interface OAuthClient {
  id: string;
  partner_name: string;
  redirect_uris: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: OAuthClient | null;
  onSuccess: () => void;
}

export function EditUriDialog({ open, onOpenChange, client, onSuccess }: Props) {
  const [uris, setUris] = useState<string[]>([]);
  const { updateUris, isUpdating } = useOAuthClients(false);

  useEffect(() => {
    if (client) {
      setUris([...client.redirect_uris]);
    }
  }, [client]);

  const handleUpdate = async () => {
    if (!client) return;

    try {
      await updateUris({
        clientId: client.id,
        redirectUris: uris.filter(uri => uri.trim())
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Redirect URIs</DialogTitle>
          <DialogDescription>
            Update redirect URIs for {client?.partner_name}
          </DialogDescription>
        </DialogHeader>
        <UriManager
          uris={uris}
          onUrisChange={setUris}
          label="Redirect URIs"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating && <Loader size="sm" className="mr-2" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
