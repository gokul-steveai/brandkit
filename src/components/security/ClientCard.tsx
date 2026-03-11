import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Copy, Edit } from 'lucide-react';

interface OAuthClient {
  id: string;
  client_id: string;
  partner_name: string;
  redirect_uris: string[];
  created_at: string;
}

interface Props {
  client: OAuthClient;
  onEdit: (client: OAuthClient) => void;
  onDelete: (client: OAuthClient) => void;
  onCopy: (text: string) => void;
}

export function ClientCard({ client, onEdit, onDelete, onCopy }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{client.partner_name}</CardTitle>
            <CardDescription>
              Created {new Date(client.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onDelete(client)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Client ID</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-sm bg-muted p-2 rounded">{client.client_id}</code>
            <Button variant="ghost" size="icon" onClick={() => onCopy(client.client_id)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Redirect URIs</Label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 space-y-1">
              {client.redirect_uris.map((uri, i) => (
                <div key={i} className="text-sm bg-muted p-2 rounded">{uri}</div>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}