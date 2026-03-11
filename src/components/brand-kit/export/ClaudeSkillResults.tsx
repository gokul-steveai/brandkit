import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Check, ExternalLink, FileArchive, FileText, RefreshCw } from 'lucide-react';
import { ClaudeSkillExportResult } from './types';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClaudeSkillResultsProps {
  result: ClaudeSkillExportResult;
  brandKitId: string;
  onClose: () => void;
  onRegenerate?: () => void;
}

export function ClaudeSkillResults({ result, brandKitId, onClose, onRegenerate }: ClaudeSkillResultsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Auto-save on first render
  useEffect(() => {
    if (user && !hasSaved) {
      autoSaveExport();
    }
  }, [user, result]);

  const autoSaveExport = async () => {
    if (!user) return;
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const referenceName = `claude-skill-${timestamp}`;
      const storagePath = `${user.id}/${brandKitId}/${referenceName}.md`;

      await supabase.storage
        .from('brand-kit-exports')
        .upload(storagePath, result.skillMd, {
          contentType: 'text/markdown',
          upsert: true,
        });

      const { data: existing } = await supabase
        .from('brand_kit_exports')
        .select('id')
        .eq('brand_kit_id', brandKitId)
        .eq('export_type', 'claude_skill')
        .eq('user_id', user.id)
        .maybeSingle();

      const exportData = {
        brand_kit_id: brandKitId,
        user_id: user.id,
        title: `Claude Skill Export - ${timestamp}`,
        description: result.description,
        reference_name: referenceName,
        export_type: 'claude_skill',
        export_format: 'markdown',
        storage_path: storagePath,
        file_size_bytes: new Blob([result.skillMd]).size,
        sections_included: result.metadata.sectionsIncluded,
        meta_tags: ['claude', 'skill', 'brand-guidelines'],
        content_summary: `${result.metadata.filesIncluded.length} files included`,
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
      toast({
        title: 'Copied to clipboard',
        description: `${section} copied successfully.`,
      });
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again or use manual selection.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadZip = () => {
    try {
      const byteCharacters = atob(result.zipBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.metadata.brandName.toLowerCase().replace(/\s+/g, '-')}-brand-skill.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: 'Your Claude Skill ZIP is downloading.',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the ZIP file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadSkillMd = () => {
    const blob = new Blob([result.skillMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <h3 className="font-medium text-green-700 dark:text-green-400 mb-2">
          Claude Skill generated successfully!
        </h3>
        <p className="text-sm text-muted-foreground">
          Your brand skill is ready. Download the ZIP file and upload it to Claude.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileArchive className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{result.metadata.brandName} Brand Skill</h4>
              <p className="text-xs text-muted-foreground">
                {result.metadata.filesIncluded.length} files included
              </p>
            </div>
          </div>
          <Button onClick={handleDownloadZip} size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download ZIP
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">ZIP Contents:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>SKILL.md (main skill file)</li>
            {result.metadata.filesIncluded.filter(f => f !== 'SKILL.md').map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">SKILL.md Preview</h4>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(result.skillMd, 'SKILL.md')}
            >
              {copiedSection === 'SKILL.md' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadSkillMd}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
          <strong>Generated Description:</strong> {result.description}
        </div>
        <ScrollArea className="h-[250px] w-full rounded-md border p-4">
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {result.skillMd}
          </pre>
        </ScrollArea>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium mb-3">How to upload to Claude</h4>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            Go to{' '}
            <a 
              href="https://claude.ai/settings/skills" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Claude Settings → Skills <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Click <strong>"Create Skill"</strong></li>
          <li>Upload the downloaded <strong>ZIP file</strong></li>
          <li>Review the skill name and description</li>
          <li>Click <strong>"Create"</strong> to save your skill</li>
          <li>Your skill is now available to use in any Claude conversation!</li>
        </ol>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => copyToClipboard(result.skillMd, 'SKILL.md')}>
          {copiedSection === 'SKILL.md' ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy SKILL.md
        </Button>
        {onRegenerate && (
          <Button onClick={onRegenerate} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        )}
        <Button onClick={onClose} className="ml-auto">
          Done
        </Button>
      </div>
    </div>
  );
}
