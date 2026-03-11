import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Sparkles, Lock } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { TagInput } from './upload-wizard/TagInput';

interface UserUploadedFile {
  id: string;
  title: string;
  description: string | null;
  file_type: 'pdf' | 'json' | 'markdown';
  storage_path: string;
  tags: string[];
  department: string | null;
  created_at: string;
  file_size_bytes: number | null;
  version: string | null;
  sensitivity: string | null;
  audience: string | null;
  source: string | null;
  attribution: string | null;
  related_projects: string[] | null;
}

interface EditFormData {
  title: string;
  description: string;
  tags: string[];
  department: string;
  version: string;
  sensitivity: string;
  audience: string;
  source: string;
  attribution: string;
  related_projects: string[];
}

interface EditKnowledgeFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: UserUploadedFile | null;
  onSave: () => void;
}

export function EditKnowledgeFileDialog({
  open,
  onOpenChange,
  file,
  onSave,
}: EditKnowledgeFileDialogProps) {
  const [formData, setFormData] = useState<EditFormData>({
    title: '',
    description: '',
    tags: [],
    department: '',
    version: '1.0',
    sensitivity: 'Internal',
    audience: '',
    source: '',
    attribution: '',
    related_projects: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { subscription } = useSubscription();

  const isPaidUser = subscription?.subscription_tier === 'base' || subscription?.subscription_tier === 'premium';

  // Populate form when file changes
  useEffect(() => {
    if (file) {
      setFormData({
        title: file.title || '',
        description: file.description || '',
        tags: file.tags || [],
        department: file.department || '',
        version: file.version || '1.0',
        sensitivity: file.sensitivity || 'Internal',
        audience: file.audience || '',
        source: file.source || '',
        attribution: file.attribution || '',
        related_projects: file.related_projects || [],
      });
    }
  }, [file]);

  const updateField = <K extends keyof EditFormData>(field: K, value: EditFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAiGenerate = async () => {
    if (!isPaidUser || !file || file.file_type === 'pdf') return;

    setIsGenerating(true);
    try {
      // Fetch file content
      const { data: signedUrlData } = await supabase.storage
        .from('user-knowledge-files')
        .createSignedUrl(file.storage_path, 60);

      if (!signedUrlData?.signedUrl) {
        throw new Error('Could not access file');
      }

      const response = await fetch(signedUrlData.signedUrl);
      const content = await response.text();

      const { data, error } = await supabase.functions.invoke('generate-file-metadata', {
        body: {
          fileContent: content,
          fileName: file.title,
          fileType: file.file_type,
        },
      });

      if (error) throw error;

      if (data?.metadata) {
        setFormData(prev => ({
          ...prev,
          title: data.metadata.title || prev.title,
          description: data.metadata.description || '',
          tags: data.metadata.tags || [],
          department: data.metadata.department || '',
          sensitivity: data.metadata.sensitivity || 'Internal',
          audience: data.metadata.audience || '',
          source: data.metadata.source || '',
          attribution: data.metadata.attribution || '',
          related_projects: data.metadata.related_projects || [],
        }));
        toast({ title: 'Metadata regenerated', description: 'AI has analyzed your document' });
      }
    } catch (error) {
      console.error('Error generating metadata:', error);
      toast({
        title: 'Generation failed',
        description: 'Could not regenerate metadata.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;

    if (!formData.title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a document title', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_knowledge_file_uploads')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          tags: formData.tags,
          department: formData.department.trim() || null,
          version: formData.version.trim() || '1.0',
          sensitivity: formData.sensitivity || 'Internal',
          audience: formData.audience.trim() || null,
          source: formData.source.trim() || null,
          attribution: formData.attribution.trim() || null,
          related_projects: formData.related_projects,
          updated_at: new Date().toISOString(),
        })
        .eq('id', file.id);

      if (error) throw error;

      toast({ title: 'Changes saved', description: 'Document metadata has been updated' });
      onOpenChange(false);
      onSave();
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast({ title: 'Save failed', description: 'Could not save changes', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document Metadata</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Generate Button */}
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      onClick={handleAiGenerate}
                      disabled={!isPaidUser || isGenerating || file.file_type === 'pdf'}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isPaidUser ? (
                        <Sparkles className="mr-2 h-4 w-4" />
                      ) : (
                        <Lock className="mr-2 h-4 w-4" />
                      )}
                      Regenerate with AI
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!isPaidUser ? (
                    <p>Upgrade to Base or Premium to unlock AI-powered metadata generation</p>
                  ) : file.file_type === 'pdf' ? (
                    <p>AI metadata generation is not available for PDF files</p>
                  ) : (
                    <p>Let AI re-analyze your document and suggest new metadata</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Document title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of the document"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={formData.tags}
              onChange={(tags) => updateField('tags', tags)}
              placeholder="Add relevant tags..."
            />
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="e.g., Marketing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-version">Version</Label>
              <Input
                id="edit-version"
                value={formData.version}
                onChange={(e) => updateField('version', e.target.value)}
                placeholder="1.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sensitivity">Sensitivity</Label>
              <Select
                value={formData.sensitivity}
                onValueChange={(value) => updateField('sensitivity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Confidential">Confidential</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-audience">Audience</Label>
              <Input
                id="edit-audience"
                value={formData.audience}
                onChange={(e) => updateField('audience', e.target.value)}
                placeholder="e.g., Executives, Team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source">Source</Label>
              <Input
                id="edit-source"
                value={formData.source}
                onChange={(e) => updateField('source', e.target.value)}
                placeholder="Where this came from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-attribution">Attribution</Label>
              <Input
                id="edit-attribution"
                value={formData.attribution}
                onChange={(e) => updateField('attribution', e.target.value)}
                placeholder="Credit/author"
              />
            </div>
          </div>

          {/* Related Projects */}
          <div className="space-y-2">
            <Label>Related Projects</Label>
            <TagInput
              value={formData.related_projects}
              onChange={(projects) => updateField('related_projects', projects)}
              placeholder="Add related project..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
