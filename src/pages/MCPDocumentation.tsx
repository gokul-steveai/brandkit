import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Key, Copy, Terminal, AlertTriangle, CheckCircle, ExternalLink, Settings } from 'lucide-react';
import { toast } from '@/hooks/useToast';

export function MCPDocumentation() {
  const mcpServerUrl = `https://fupwpcqmyykfiuakjxxc.supabase.co/functions/v1/mcp-server`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const claudeDesktopConfig = `{
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
}`;

  const cursorConfig = `{
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
}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold mb-2">MCP Setup Guide</h1>
          <p className="text-muted-foreground text-lg">
            Connect your brand kits to AI tools using the Model Context Protocol
          </p>
        </div>

        {/* What is MCP */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What is MCP?</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              The <strong>Model Context Protocol (MCP)</strong> is an open standard that allows AI applications to securely 
              access external data sources. By connecting Brand Kit OS to your AI tools via MCP, you can:
            </p>
            <ul>
              <li>Give AI assistants direct access to your brand guidelines</li>
              <li>Ensure consistent brand voice across all AI-generated content</li>
              <li>Reference your products, audience personas, and governance rules</li>
              <li>Keep your brand data synced automatically</li>
            </ul>
          </CardContent>
        </Card>

        {/* Prerequisites */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Prerequisites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Paid Subscription</strong>
                  <p className="text-sm text-muted-foreground">
                    MCP access requires a Base or Premium plan.{' '}
                    <Link to="/settings?tab=billing" className="underline">View plans</Link>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <strong>API Key</strong>
                  <p className="text-sm text-muted-foreground">
                    Generate an API key from your{' '}
                    <Link to="/settings?tab=api-keys" className="underline">Settings → API Keys</Link>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Node.js Installed</strong>
                  <p className="text-sm text-muted-foreground">
                    Required for npx commands. <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="underline">Download Node.js</a>
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Getting Your API Key */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Step 1: Get Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <Link to="/settings?tab=api-keys" className="underline font-medium">Settings → API Keys</Link></li>
              <li>Click <strong>Create API Key</strong></li>
              <li>Enter a descriptive name (e.g., "Claude Desktop" or "Cursor")</li>
              <li>Copy your API key immediately - <span className="text-amber-600 dark:text-amber-400">you won't be able to see it again!</span></li>
            </ol>
            <Button asChild>
              <Link to="/settings?tab=api-keys">
                <Settings className="h-4 w-4 mr-2" />
                Go to API Keys
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Configuration Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Step 2: Configure Your AI Tool
            </CardTitle>
            <CardDescription>
              Select your AI tool below for specific setup instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="claude-desktop" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
                <TabsTrigger value="cursor">Cursor</TabsTrigger>
                <TabsTrigger value="other">Other Tools</TabsTrigger>
              </TabsList>

              <TabsContent value="claude-desktop" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Locate your config file</h4>
                  <p className="text-sm text-muted-foreground">
                    The Claude Desktop configuration file is located at:
                  </p>
                  <ul className="text-sm font-mono bg-muted p-3 rounded-md space-y-1">
                    <li><strong>macOS:</strong> ~/Library/Application Support/Claude/claude_desktop_config.json</li>
                    <li><strong>Windows:</strong> %APPDATA%\Claude\claude_desktop_config.json</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">2. Add the MCP server configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Add this to your config file (replace YOUR_API_KEY with your actual key):
                  </p>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-md text-sm font-mono overflow-x-auto">
                      {claudeDesktopConfig}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(claudeDesktopConfig, 'Config')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. Restart Claude Desktop</h4>
                  <p className="text-sm text-muted-foreground">
                    Completely quit and restart Claude Desktop for the changes to take effect.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">4. Verify the connection</h4>
                  <p className="text-sm text-muted-foreground">
                    In Claude Desktop, you should see Brand Kit OS listed as an available MCP server.
                    Try asking Claude to "list my brand kits" to verify the connection works.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="cursor" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Open Cursor Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Go to Settings → Features → MCP (or search for "MCP" in settings)
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">2. Add the MCP server</h4>
                  <p className="text-sm text-muted-foreground">
                    Add a new MCP server with this configuration (replace YOUR_API_KEY):
                  </p>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-md text-sm font-mono overflow-x-auto">
                      {cursorConfig}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(cursorConfig, 'Config')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. Reload Cursor</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the Command Palette (Cmd/Ctrl+Shift+P) and search for "Reload Window".
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Any MCP-compatible tool can connect to Brand Kit OS using these details:
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Server URL</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all">
                      {mcpServerUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(mcpServerUrl, 'URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the Authorization header with your API key:
                  </p>
                  <code className="block p-3 bg-muted rounded-md text-sm font-mono">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Protocol Version</h4>
                  <p className="text-sm text-muted-foreground">
                    Brand Kit OS MCP server uses protocol version: <Badge variant="secondary">2024-11-05</Badge>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Available Tools */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Available MCP Tools</CardTitle>
            <CardDescription>
              These tools are available to AI assistants connected via MCP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'list_brand_kits', desc: 'List all brand kits you have access to' },
                { name: 'get_brand_kit', desc: 'Get complete brand kit data including all sections' },
                { name: 'get_brand_kit_core', desc: 'Get core identity (mission, vision, brand story)' },
                { name: 'get_brand_kit_personality', desc: 'Get personality traits, values, principles, and moods' },
                { name: 'get_brand_kit_expression', desc: 'Get tone of voice, verbal style, and visual style' },
                { name: 'get_brand_kit_products', desc: 'Get products and services catalog' },
                { name: 'get_brand_kit_audience', desc: 'Get target audience personas' },
                { name: 'get_brand_kit_governance', desc: 'Get behavioral constraints and policies' },
                { name: 'get_brand_kit_personas', desc: 'Get AI personas configured for the brand' },
                { name: 'list_knowledge_files', desc: 'List knowledge files attached to a brand kit' },
                { name: 'get_knowledge_file', desc: 'Get metadata for a specific knowledge file' },
              ].map((tool) => (
                <div key={tool.name} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <code className="text-sm font-mono font-medium shrink-0">{tool.name}</code>
                  <span className="text-sm text-muted-foreground">{tool.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Connection refused / timeout</h4>
              <p className="text-sm text-muted-foreground">
                Make sure Node.js is installed and npx is available in your PATH. Try running
                <code className="mx-1 px-1 bg-muted rounded">npx --version</code> in your terminal.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-1">401 Unauthorized</h4>
              <p className="text-sm text-muted-foreground">
                Your API key may be invalid or expired. Generate a new key from Settings → API Keys.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-1">403 Forbidden - Subscription required</h4>
              <p className="text-sm text-muted-foreground">
                MCP access requires a paid subscription. <Link to="/settings?tab=billing" className="underline">Upgrade your plan</Link>.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-1">429 Rate limit exceeded</h4>
              <p className="text-sm text-muted-foreground">
                You've made too many requests. Wait a minute and try again. The limit is 100 requests per minute.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-1">MCP server not appearing in Claude Desktop</h4>
              <p className="text-sm text-muted-foreground">
                Make sure you've completely quit Claude Desktop (check your system tray) and restarted it.
                Also verify your config file is valid JSON.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Best Practices */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Security Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm">
                  <strong>Use descriptive key names</strong> - Name keys after the tool they're used with 
                  (e.g., "Claude Desktop - Work Laptop") so you can identify and revoke them if needed.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm">
                  <strong>Don't share API keys</strong> - Each user should generate their own API key.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm">
                  <strong>Revoke unused keys</strong> - Delete API keys you're no longer using from Settings.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm">
                  <strong>Monitor usage</strong> - Check the "Last used" date in Settings to spot unusual activity.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Learn More */}
        <Card>
          <CardHeader>
            <CardTitle>Learn More</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://modelcontextprotocol.io/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm underline hover:text-foreground text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Official MCP Documentation
              </a>
              <a
                href="https://docs.anthropic.com/en/docs/claude-desktop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm underline hover:text-foreground text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Claude Desktop Documentation
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
