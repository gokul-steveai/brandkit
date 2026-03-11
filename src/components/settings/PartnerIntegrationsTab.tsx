import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import { Plug, RefreshCw, ExternalLink, Plus } from 'lucide-react';
import { LinkPartnerDialog } from './LinkPartnerDialog';
import { WebhookDeliveriesTable } from './WebhookDeliveriesTable';

export function PartnerIntegrationsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['partner-integrations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_integrations')
        .select(`
          id,
          partner_name,
          is_active,
          external_user_id,
          external_workspace_id,
          webhook_url,
          created_at,
          partner_integration_brand_kits!inner(
            brand_kits!inner(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    inactive: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Integrations Overview */}
      <Card className="border-2 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Partner Integrations
            </CardTitle>
            <CardDescription>
              Manage partner connections that receive your brand kit data
            </CardDescription>
          </div>
          <Button onClick={() => setLinkDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Link Partner
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : !integrations || integrations.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Plug className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">No partner integrations</p>
                <p className="text-xs text-muted-foreground">
                  Link a partner app to start syncing brand kit data automatically.
                </p>
              </div>
              <Button onClick={() => setLinkDialogOpen(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Link Partner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium capitalize">{integration.partner_name}</p>
                      <Badge className={statusColors[integration.is_active ? 'active' : 'inactive']} variant="secondary">
                        {integration.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      Brand Kits: {integration.partner_integration_brand_kits?.map((link: any) => link.brand_kits.name).join(', ') || 'None'}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      {integration.external_user_id && (
                        <span>User: {integration.external_user_id}</span>
                      )}
                      {integration.external_workspace_id && (
                        <span>Workspace: {integration.external_workspace_id}</span>
                      )}
                      {integration.webhook_url && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Webhook configured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Webhook Deliveries */}
      <WebhookDeliveriesTable />

      {/* Link Partner Dialog */}
      <LinkPartnerDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['partner-integrations'] });
        }}
      />
    </div>
  );
}
