import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormState, useOAuthClients } from '@/hooks/useOAuth';
import { UriManager } from './index';
import { Loader } from '@/components/ui/loader';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (credentials: { client_id: string; client_secret: string; partner_name: string }) => void;
}

interface FormData {
  partner_name: string;
  redirect_uris: string[];
}

const INITIAL_FORM: FormData = {
  partner_name: '',
  redirect_uris: [''],
};

export function CreateClientDialog({ open, onOpenChange, onSuccess }: Props) {
  const { formData, updateField, resetForm } = useFormState(INITIAL_FORM);
  const { createClient, isCreating } = useOAuthClients(false);

  const handleCreate = async () => {
    try {
      const credentials = await createClient({
        partner_name: formData.partner_name.trim(),
        redirect_uris: formData.redirect_uris.filter(uri => uri.trim()),
      });

      onSuccess({ ...credentials, partner_name: formData.partner_name.trim() });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create OAuth Client</DialogTitle>
          <DialogDescription>Create a new OAuth client application</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Partner Name *</Label>
            <Input
              value={formData.partner_name}
              onChange={(e) => updateField('partner_name', e.target.value)}
              placeholder="My App"
            />
          </div>
          <UriManager
            uris={formData.redirect_uris}
            onUrisChange={(uris) => updateField('redirect_uris', uris)}
            label="Redirect URIs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating && <Loader size="sm" className="mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
