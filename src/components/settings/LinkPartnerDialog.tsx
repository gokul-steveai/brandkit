import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/useToast';
import { Loader2 } from 'lucide-react';
import { useBrandKits, useOAuthClients, useFormState } from '@/hooks/useOAuth';
import { createPartnerIntegration, linkBrandKitsToIntegration } from '@/lib/integrations/partnerService';
import { useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  brand_kit_ids: string[];
  client_id: string;
  external_user_id: string;
  external_workspace_id: string;
  webhook_url: string;
}

const INITIAL_FORM: FormData = {
  brand_kit_ids: [],
  client_id: '',
  external_user_id: '',
  external_workspace_id: '',
  webhook_url: '',
};

export function LinkPartnerDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formData, updateField, resetForm } = useFormState(INITIAL_FORM);
  
  const { data: brandKits } = useBrandKits(!!user && open);
  const { data: oauthClients } = useOAuthClients(!!user && open);

  const validateForm = () => {
    if (!formData.brand_kit_ids.length) {
      toast({ title: 'Select at least one brand kit', variant: 'destructive' });
      return false;
    }
    if (!formData.client_id) {
      toast({ title: 'Select an OAuth client', variant: 'destructive' });
      return false;
    }
    if (!formData.external_user_id && !formData.external_workspace_id) {
      toast({ title: 'Either External User ID or External Workspace ID is required', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    try {
      const integration = await createPartnerIntegration({
        client_id: formData.client_id,
        user_id: user.id,
        external_user_id: formData.external_user_id,
        external_workspace_id: formData.external_workspace_id,
        webhook_url: formData.webhook_url,
      });
      
      await linkBrandKitsToIntegration(integration.id, formData.brand_kit_ids);
      
      toast({ title: 'Partner integration created successfully' });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link partner';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandKitChange = (brandKitId: string, checked: boolean) => {
    const newIds = checked 
      ? [...formData.brand_kit_ids, brandKitId]
      : formData.brand_kit_ids.filter(id => id !== brandKitId);
    updateField('brand_kit_ids', newIds);
  };

  if (!oauthClients?.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create OAuth Application First</DialogTitle>
            <DialogDescription>
              No OAuth applications found. Create one before linking partners.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <Button onClick={() => {
              onOpenChange(false);
              navigate('/security?create=true');
            }}>
              Create OAuth Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Partner Integration</DialogTitle>
          <DialogDescription>
            Connect brand kits to a partner application via API.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>OAuth Client *</Label>
            <Select value={formData.client_id} onValueChange={(v) => updateField('client_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select OAuth client" />
              </SelectTrigger>
              <SelectContent>
                {oauthClients.map((client) => (
                  <SelectItem key={client.client_id} value={client.client_id}>
                    {client.partner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Brand Kits *</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {brandKits?.map((kit) => (
                <div key={kit.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={kit.id}
                    checked={formData.brand_kit_ids.includes(kit.id)}
                    onCheckedChange={(checked) => handleBrandKitChange(kit.id, !!checked)}
                  />
                  <Label htmlFor={kit.id} className="text-sm cursor-pointer">
                    {kit.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>External User ID *</Label>
            <Input
              value={formData.external_user_id}
              onChange={(e) => updateField('external_user_id', e.target.value)}
              placeholder="Partner's user identifier"
            />
          </div>

          <div className="space-y-2">
            <Label>External Workspace ID *</Label>
            <Input
              value={formData.external_workspace_id}
              onChange={(e) => updateField('external_workspace_id', e.target.value)}
              placeholder="Partner's workspace identifier"
            />
            <p className="text-xs text-muted-foreground">* At least one of External User ID or Workspace ID is required</p>
          </div>

          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              type="url"
              value={formData.webhook_url}
              onChange={(e) => updateField('webhook_url', e.target.value)}
              placeholder="https://partner.com/webhooks"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Partner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}