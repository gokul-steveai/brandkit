import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';

interface Props {
  credentials: {
    client_id: string;
    client_secret: string;
    partner_name: string;
  };
  onDismiss: () => void;
  onCopy: (text: string) => void;
}

export function CredentialsDisplay({ credentials, onDismiss, onCopy }: Props) {
  return (
    <Card className="border-green-500 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-900">Client Created: {credentials.partner_name}</CardTitle>
        <CardDescription className="text-green-700">
          Save these credentials - the secret won't be shown again
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-green-900">Client ID</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-sm bg-white p-2 rounded border">
              {credentials.client_id}
            </code>
            <Button variant="outline" size="icon" onClick={() => onCopy(credentials.client_id)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-green-900">Client Secret</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-sm bg-white p-2 rounded border">
              {credentials.client_secret}
            </code>
            <Button variant="outline" size="icon" onClick={() => onCopy(credentials.client_secret)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" onClick={onDismiss} className="w-full">
          Dismiss
        </Button>
      </CardContent>
    </Card>
  );
}