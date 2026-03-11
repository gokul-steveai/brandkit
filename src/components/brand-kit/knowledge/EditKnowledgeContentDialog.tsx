import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserUploadedFile {
  id: string;
  title: string;
  file_type: 'pdf' | 'json' | 'markdown';
  storage_path: string;
}

interface EditKnowledgeContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: UserUploadedFile | null;
  initialContent: string;
  onSaved: () => void;
}

export function EditKnowledgeContentDialog({
  open,
  onOpenChange,
  file,
  initialContent,
  onSaved,
}: EditKnowledgeContentDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setJsonError(null);
    }
  }, [open, initialContent]);

  // Validate JSON on change
  useEffect(() => {
    if (file?.file_type === 'json' && content) {
      try {
        JSON.parse(content);
        setJsonError(null);
      } catch (err) {
        setJsonError('Invalid JSON syntax');
      }
    }
  }, [content, file?.file_type]);

  const getMimeType = (fileType: string): string => {
    switch (fileType) {
      case 'json':
        return 'application/json';
      case 'markdown':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  };

  const handleSave = async () => {
    if (!file) return;

    // Validate JSON before saving
    if (file.file_type === 'json') {
      try {
        JSON.parse(content);
      } catch {
        toast.error('Cannot save: Invalid JSON syntax');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Create blob with new content
      const blob = new Blob([content], { type: getMimeType(file.file_type) });

      // Upload to same storage path (upsert)
      const { error: uploadError } = await supabase.storage
        .from('user-knowledge-files')
        .update(file.storage_path, blob, { 
          upsert: true,
          contentType: getMimeType(file.file_type)
        });

      if (uploadError) throw uploadError;

      // Update file size in database
      const { error: dbError } = await supabase
        .from('user_knowledge_file_uploads')
        .update({
          file_size_bytes: blob.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast.success('Content saved successfully');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving content:', err);
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = content !== initialContent;

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Content: {file.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {file.file_type === 'json' && jsonError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {jsonError}
            </div>
          )}
          
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 font-mono text-sm resize-none min-h-0"
            placeholder="Enter file content..."
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length.toLocaleString()} characters</span>
            {hasChanges && <span className="text-primary">Unsaved changes</span>}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || (file.file_type === 'json' && !!jsonError)}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
