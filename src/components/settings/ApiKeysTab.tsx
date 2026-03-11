import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';
import { Key, Plus, Trash2, Copy, ExternalLink, Lock } from 'lucide-react';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { format } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function ApiKeysTab() {
  const { user } = useAuth();
  const { canAccessFeature } = useSubscription();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const hasMcpAccess = canAccessFeature('mcpAccess');

  useEffect(() => {
    if (user && hasMcpAccess) {
      fetchApiKeys();
    } else {
      setIsLoading(false);
    }
  }, [user, hasMcpAccess]);

  const fetchApiKeys = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, last_used_at, created_at, expires_at, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      toast({ title: 'Failed to load API keys', variant: 'destructive' });
    } else {
      setApiKeys(data || []);
    }
    setIsLoading(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      toast({ title: 'Failed to delete API key', variant: 'destructive' });
    } else {
      toast({ title: 'API key deleted' });
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
    }
  };

  const handleKeyCreated = (newKey: ApiKey) => {
    setApiKeys(prev => [newKey, ...prev]);
    // Don't close dialog - let user see and copy the key first
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const mcpServerUrl = `https://fupwpcqmyykfiuakjxxc.supabase.co/functions/v1/mcp-server`;

  if (!hasMcpAccess) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            API Keys & MCP Access
          </CardTitle>
          <CardDescription>
            Connect your brand kits to AI tools like Claude Desktop and Cursor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <Key className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Premium Feature</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                MCP (Model Context Protocol) access allows you to connect your brand kits directly to AI tools. 
                Upgrade to Base or Premium to unlock this feature.
              </p>
            </div>
            <Button variant="default" onClick={() => window.location.href = '/settings?tab=billing'}>
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate API keys to connect your brand kits to AI tools via MCP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''} created
            </p>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div 
                  key={key.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {!key.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {key.expires_at && new Date(key.expires_at) < new Date() && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono">bk_{key.key_prefix}...</span>
                      <span>Created {format(new Date(key.created_at), 'MMM d, yyyy')}</span>
                      {key.last_used_at && (
                        <span>Last used {format(new Date(key.last_used_at), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteKey(key.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle>MCP Server Configuration</CardTitle>
          <CardDescription>
            Use these settings to connect your AI tools to Brand Kit OS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Server URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all">
                {mcpServerUrl}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(mcpServerUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Claude Desktop Configuration</label>
            <p className="text-sm text-muted-foreground mb-2">
              Add this to your Claude Desktop config file (claude_desktop_config.json):
            </p>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-sm font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "brand-kit-os": {
      "command": "npx",
      "args": [
        "@anthropic-ai/mcp-remote",
        "${mcpServerUrl}"
      ],
      "env": {
        "MCP_HEADERS": "Authorization: Bearer YOUR_API_KEY"
      }
    }
  }
}`}
              </pre>
              <Button 
                variant="outline" 
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(`{
  "mcpServers": {
    "brand-kit-os": {
      "command": "npx",
      "args": [
        "@anthropic-ai/mcp-remote",
        "${mcpServerUrl}"
      ],
      "env": {
        "MCP_HEADERS": "Authorization: Bearer YOUR_API_KEY"
      }
    }
  }
}`)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            <a 
              href="/help/mcp" 
              className="underline hover:text-foreground"
            >
              View full MCP setup documentation
            </a>
          </div>
        </CardContent>
      </Card>

      <CreateApiKeyDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onKeyCreated={handleKeyCreated}
      />
    </div>
  );
}
