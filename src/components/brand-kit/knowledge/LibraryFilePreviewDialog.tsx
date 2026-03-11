import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LibraryKnowledgeFile {
  id: string;
  reference_name: string;
  display_name: string;
  description: string | null;
  file_type: string;
  system_instruction_hint: string | null;
  storage_path?: string | null;
}

interface LibraryFilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: LibraryKnowledgeFile | null;
}

export function LibraryFilePreviewDialog({ 
  open, 
  onOpenChange, 
  file 
}: LibraryFilePreviewDialogProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && file?.storage_path) {
      loadContent(file.storage_path);
    } else {
      setContent('');
      setError(null);
    }
  }, [open, file?.storage_path]);

  const loadContent = async (storagePath: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = supabase.storage
        .from('knowledge_files')
        .getPublicUrl(storagePath);

      const response = await fetch(data.publicUrl);
      if (!response.ok) {
        throw new Error('Failed to load file content');
      }
      
      const text = await response.text();
      setContent(text);
    } catch (err) {
      console.error('Error loading file content:', err);
      setError('Could not load file content. The file may not exist yet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simple markdown to HTML conversion for display
  const renderMarkdown = (md: string) => {
    return md
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-semibold mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-xl font-bold mb-4">{line.slice(2)}</h1>;
        }
        // List items
        if (line.startsWith('- [ ] ')) {
          return <div key={i} className="flex items-start gap-2 ml-4"><input type="checkbox" disabled className="mt-1" /><span>{line.slice(6)}</span></div>;
        }
        if (line.startsWith('- ')) {
          const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: text }} />;
        }
        // Numbered list
        if (/^\d+\. /.test(line)) {
          return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        // Empty line
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        // Regular paragraph with bold support
        const text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: text }} />;
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{file?.display_name || 'Preview'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] rounded-md border p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {renderMarkdown(content)}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
