import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Check, ExternalLink, FileText, Info, Loader2, RefreshCw } from 'lucide-react';
import { GPTExportResult, GPTExportConfig } from './types';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface KnowledgeFileItem {
  id: string;
  title: string;
  storagePath: string;
  fileType: string;
  source: 'user' | 'template' | 'auto-generated';
  bucketName: string;
}

interface GPTExportResultsProps {
  result: GPTExportResult;
  brandKitId: string;
  config: GPTExportConfig;
  onClose: () => void;
  onRegenerate: () => void;
}

export function GPTExportResults({ result, brandKitId, config, onClose, onRegenerate }: GPTExportResultsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Auto-save on first render
  useEffect(() => {
    if (user && !hasSaved) {
      autoSaveExport();
    }
  }, [user, result]);

  // Fetch knowledge files filtered by selection
  useEffect(() => {
    async function fetchKnowledgeFiles() {
      setIsLoadingFiles(true);
      try {
        const files: KnowledgeFileItem[] = [];
        const selectedIds = config.selectedKnowledgeFileIds || [];

        // 1. User-uploaded files
        const { data: userFiles } = await supabase
          .from('user_knowledge_file_uploads')
          .select('id, title, storage_path, file_type, is_ai_generated_metadata')
          .eq('brand_kit_id', brandKitId);

        if (userFiles) {
          for (const f of userFiles) {
            const prefixedId = `user:${f.id}`;
            if (selectedIds.length === 0 || selectedIds.includes(prefixedId)) {
              files.push({
                id: f.id,
                title: f.title,
                storagePath: f.storage_path,
                fileType: f.file_type,
                source: f.is_ai_generated_metadata ? 'auto-generated' : 'user',
                bucketName: 'user-knowledge-files',
              });
            }
          }
        }

        // 2. Selected library templates
        const { data: templateLinks } = await supabase
          .from('brand_kit_knowledge_files')
          .select('id, custom_reference_name, library_knowledge_files(id, display_name, storage_path, file_type)')
          .eq('brand_kit_id', brandKitId);

        if (templateLinks) {
          for (const link of templateLinks) {
            const lib = link.library_knowledge_files as any;
            if (lib?.storage_path) {
              const prefixedId = `template:${link.id}`;
              if (selectedIds.length === 0 || selectedIds.includes(prefixedId)) {
                files.push({
                  id: link.id,
                  title: link.custom_reference_name || lib.display_name,
                  storagePath: lib.storage_path,
                  fileType: lib.file_type,
                  source: 'template',
                  bucketName: 'knowledge_files',
                });
              }
            }
          }
        }

        setKnowledgeFiles(files);
      } catch (error) {
        console.error('Error fetching knowledge files:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    }

    fetchKnowledgeFiles();
  }, [brandKitId, config.selectedKnowledgeFileIds]);

  const autoSaveExport = async () => {
    if (!user) return;
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const referenceName = `gpt-export-${timestamp}`;
      const storagePath = `${user.id}/${brandKitId}/${referenceName}.md`;

      await supabase.storage
        .from('brand-kit-exports')
        .upload(storagePath, result.systemInstructions, {
          contentType: 'text/markdown',
          upsert: true,
        });

      // Upsert: check if export exists for this brand kit + type
      const { data: existing } = await supabase
        .from('brand_kit_exports')
        .select('id')
        .eq('brand_kit_id', brandKitId)
        .eq('export_type', 'chatgpt_custom_gpt')
        .eq('user_id', user.id)
        .maybeSingle();

      const exportData = {
        brand_kit_id: brandKitId,
        user_id: user.id,
        title: `ChatGPT Custom GPT Export - ${timestamp}`,
        description: `System instructions for ChatGPT Custom GPT`,
        reference_name: referenceName,
        export_type: 'chatgpt_custom_gpt',
        export_format: 'markdown',
        storage_path: storagePath,
        file_size_bytes: new Blob([result.systemInstructions]).size,
        sections_included: result.metadata.sectionsIncluded,
        export_config: result.metadata.exportConfig as any,
        gaps_filled: result.metadata.gapsFilled,
        meta_tags: ['chatgpt', 'custom-gpt', 'system-instructions'],
        content_summary: result.metadata.contentSummary,
      };

      if (existing) {
        await supabase
          .from('brand_kit_exports')
          .update(exportData as any)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('brand_kit_exports')
          .insert([exportData as any]);
      }

      setHasSaved(true);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const copyToClipboard = async (content: string, section: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(section);
      toast({ title: 'Copied to clipboard', description: `${section} copied successfully.` });
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadInstructions = () => {
    downloadFile(result.systemInstructions, 'system-instructions.md', 'text/markdown');
  };

  const handleDownloadKnowledgeFile = async (file: KnowledgeFileItem) => {
    setDownloadingFileId(file.id);
    try {
      const { data, error } = await supabase.storage.from(file.bucketName).download(file.storagePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      const ext = file.storagePath.split('.').pop() || file.fileType || 'txt';
      a.download = `${file.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: `${file.title} downloaded.` });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleCopyAll = async () => {
    let allContent = `# System Instructions\n\n${result.systemInstructions}`;
    allContent += `\n\n---\n\n# Conversation Starters\n\n${result.conversationStarters.map(s => `- ${s}`).join('\n')}`;
    await copyToClipboard(allContent, 'All');
  };

  const getSourceBadge = (source: KnowledgeFileItem['source']) => {
    switch (source) {
      case 'user': return <Badge variant="outline">Uploaded</Badge>;
      case 'template': return <Badge variant="secondary">Template</Badge>;
      case 'auto-generated': return <Badge variant="default">Auto-generated</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h4 className="font-medium mb-3">How to use in ChatGPT</h4>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Go to <a href="https://chat.openai.com/gpts/editor" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">ChatGPT GPT Editor <ExternalLink className="h-3 w-3" /></a></li>
          <li>Create a new GPT or edit an existing one</li>
          <li>Paste the <strong>System Instructions</strong> into the "Instructions" field</li>
          <li>Upload your <strong>Knowledge Files</strong> in the "Knowledge" section</li>
          <li>Add the <strong>Conversation Starters</strong></li>
          <li>Save and publish your Custom GPT</li>
        </ol>
      </Card>

      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instructions">System Instructions</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="starters">Starters</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">System Instructions</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.systemInstructions, 'Instructions')}>
                  {copiedSection === 'Instructions' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadInstructions}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Paste this into the "Instructions" field in ChatGPT's GPT Builder
            </p>
            <ScrollArea className="h-[280px] w-full rounded-md border p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">{result.systemInstructions}</pre>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Knowledge Files</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Download these files and upload them to the "Knowledge" section in ChatGPT
            </p>

            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading knowledge files...</span>
              </div>
            ) : knowledgeFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No knowledge files selected for this export.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {knowledgeFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.title}</p>
                        <p className="text-xs text-muted-foreground">{file.fileType}</p>
                      </div>
                      {getSourceBadge(file.source)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 shrink-0"
                      disabled={downloadingFileId === file.id}
                      onClick={() => handleDownloadKnowledgeFile(file)}
                    >
                      {downloadingFileId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {result.recommendedKnowledgeFiles && result.recommendedKnowledgeFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Recommended templates:</p>
                {result.recommendedKnowledgeFiles.map((file, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{file.displayName}</p>
                      <p className="text-xs text-muted-foreground">{file.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="starters" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Conversation Starters</h4>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.conversationStarters.join('\n'), 'Starters')}>
                {copiedSection === 'Starters' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy All
              </Button>
            </div>
            <div className="space-y-2">
              {result.conversationStarters.map((starter, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{starter}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(starter, `Starter ${index + 1}`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCopyAll} variant="outline">
          {copiedSection === 'All' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          Copy All
        </Button>
        <Button onClick={handleDownloadInstructions} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
        <Button onClick={onRegenerate} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
        <Button onClick={onClose} className="ml-auto">
          Done
        </Button>
      </div>
    </div>
  );
}
