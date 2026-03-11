import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/hooks/useToast';
import { RefreshCw, RotateCcw, Webhook, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function WebhookDeliveriesTable() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const { data: deliveries, isLoading, refetch } = useQuery({
    queryKey: ['webhook-deliveries', user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('webhook_deliveries')
        .select(`
          *,
          webhook_events!inner(event_type, brand_kit_id, version, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleReplay = async (eventId: string) => {
    setReplayingId(eventId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('partner-webhook', {
        method: 'POST',
        body: {},
        headers: {
          'x-custom-path': `/replay/${eventId}`,
        },
      });

      if (response.error) {
        toast({ title: 'Replay failed', description: response.error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Webhook replayed successfully' });
        refetch();
      }
    } catch (err) {
      toast({ title: 'Replay failed', variant: 'destructive' });
    } finally {
      setReplayingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    failed: 'bg-destructive/10 text-destructive',
    exhausted: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Deliveries
          </CardTitle>
          <CardDescription>
            Track webhook delivery attempts to partner endpoints
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="exhausted">Exhausted</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !deliveries || deliveries.length === 0 ? (
          <div className="text-center py-8">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No webhook deliveries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => {
                  const event = (delivery as any).webhook_events;
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{event?.event_type || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">v{event?.version || '?'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[delivery.status] || ''} variant="secondary">
                          {delivery.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {delivery.attempt_count}/{delivery.max_attempts}
                        </span>
                      </TableCell>
                      <TableCell>
                        {delivery.response_status ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-sm font-mono">{delivery.response_status}</span>
                              </TooltipTrigger>
                              {delivery.error_message && (
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">{delivery.error_message}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {delivery.last_attempt_at
                            ? formatDistanceToNow(new Date(delivery.last_attempt_at), { addSuffix: true })
                            : formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        {(delivery.status === 'failed' || delivery.status === 'exhausted') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReplay(delivery.event_id)}
                            disabled={replayingId === delivery.event_id}
                          >
                            {replayingId === delivery.event_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
