import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sparkles, Image, Code, ArrowRight, FileText, Eye, Clock } from 'lucide-react';
import { GPTExportWizard } from './GPTExportWizard';
import { ClaudeSkillWizard } from './ClaudeSkillWizard';
import { MarkdownExportWizard } from './MarkdownExportWizard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ExportTarget {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  comingSoon?: boolean;
  exportType: string; // maps to brand_kit_exports.export_type
}

interface ExistingExport {
  id: string;
  exportType: string;
  updatedAt: string;
}

const exportTargets: ExportTarget[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT Custom GPT',
    description: 'Generate system instructions and knowledge files for your own Custom GPT',
    icon: <MessageSquare className="h-8 w-8" />,
    available: true,
    exportType: 'chatgpt_custom_gpt',
  },
  {
    id: 'claude',
    name: 'Build Claude Skill',
    description: 'Create a custom Skill for Claude with brand guidelines and resources',
    icon: <Sparkles className="h-8 w-8" />,
    available: true,
    exportType: 'claude_skill',
  },
  {
    id: 'markdown',
    name: 'Export as Markdown',
    description: 'Download all brand kit data as organized markdown files in a ZIP folder',
    icon: <FileText className="h-8 w-8" />,
    available: true,
    exportType: 'markdown',
  },
  {
    id: 'midjourney',
    name: 'Image Generation',
    description: 'Generate style guides for MidJourney, DALL-E, and other image AI',
    icon: <Image className="h-8 w-8" />,
    available: false,
    comingSoon: true,
    exportType: 'midjourney',
  },
  {
    id: 'generic',
    name: 'App Builder Export',
    description: 'Export for Lovable, Cursor, and other AI app builders',
    icon: <Code className="h-8 w-8" />,
    available: false,
    comingSoon: true,
    exportType: 'generic',
  },
];

export function ExportPage() {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [showGPTWizard, setShowGPTWizard] = useState(false);
  const [showClaudeWizard, setShowClaudeWizard] = useState(false);
  const [showMarkdownWizard, setShowMarkdownWizard] = useState(false);
  const [existingExports, setExistingExports] = useState<Record<string, ExistingExport>>({});
  const [viewExportId, setViewExportId] = useState<string | null>(null);

  // Fetch existing exports on mount
  useEffect(() => {
    if (!brandKitId || !user) return;

    async function fetchExistingExports() {
      const { data } = await supabase
        .from('brand_kit_exports')
        .select('id, export_type, updated_at, created_at')
        .eq('brand_kit_id', brandKitId!)
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });

      if (data) {
        const map: Record<string, ExistingExport> = {};
        for (const row of data) {
          // Keep only the latest per export_type
          if (!map[row.export_type]) {
            map[row.export_type] = {
              id: row.id,
              exportType: row.export_type,
              updatedAt: row.updated_at || row.created_at || '',
            };
          }
        }
        setExistingExports(map);
      }
    }

    fetchExistingExports();
  }, [brandKitId, user, showGPTWizard, showClaudeWizard, showMarkdownWizard]);

  const handleExportClick = (targetId: string) => {
    setViewExportId(null);
    if (targetId === 'chatgpt') {
      setShowGPTWizard(true);
    } else if (targetId === 'claude') {
      setShowClaudeWizard(true);
    } else if (targetId === 'markdown') {
      setShowMarkdownWizard(true);
    }
  };

  const handleViewExisting = (target: ExportTarget) => {
    const existing = existingExports[target.exportType];
    if (!existing) return;

    setViewExportId(existing.id);
    if (target.id === 'chatgpt') {
      setShowGPTWizard(true);
    } else if (target.id === 'claude') {
      setShowClaudeWizard(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {exportTargets.map((target) => {
          const existing = existingExports[target.exportType];
          return (
            <Card 
              key={target.id}
              className={`relative transition-all ${
                target.available 
                  ? 'hover:border-primary cursor-pointer' 
                  : 'opacity-60'
              }`}
            >
              {target.comingSoon && (
                <Badge className="absolute top-4 right-4" variant="secondary">
                  Coming Soon
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    {target.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{target.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {target.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleExportClick(target.id)}
                      disabled={!target.available}
                      className="flex-1"
                      variant={target.available ? 'default' : 'secondary'}
                    >
                      {target.available ? (
                        <>
                          Start Export
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        'Coming Soon'
                      )}
                    </Button>
                    {existing && target.available && target.id !== 'markdown' && (
                      <Button
                        variant="outline"
                        onClick={() => handleViewExisting(target)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Existing
                      </Button>
                    )}
                  </div>
                  {existing && target.available && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last exported: {format(new Date(existing.updatedAt), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <GPTExportWizard 
        open={showGPTWizard} 
        onOpenChange={setShowGPTWizard}
        existingExportId={viewExportId}
      />

      <ClaudeSkillWizard
        open={showClaudeWizard}
        onOpenChange={setShowClaudeWizard}
        existingExportId={viewExportId}
      />

      <MarkdownExportWizard
        open={showMarkdownWizard}
        onOpenChange={setShowMarkdownWizard}
      />
    </div>
  );
}
