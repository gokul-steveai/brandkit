import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Download, FileText, FileJson, FileCode, Calendar, Building2, Users, ShieldCheck, Copy, FileEdit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditKnowledgeContentDialog } from './EditKnowledgeContentDialog';

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

interface UserFilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: UserUploadedFile | null;
  onEdit: (file: UserUploadedFile) => void;
}

export function UserFilePreviewDialog({
  open,
  onOpenChange,
  file,
  onEdit,
}: UserFilePreviewDialogProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [editContentOpen, setEditContentOpen] = useState(false);

  useEffect(() => {
    if (open && file?.storage_path) {
      loadContent(file.storage_path, file.file_type);
    } else {
      setContent('');
      setError(null);
      setDownloadUrl(null);
    }
  }, [open, file?.storage_path, file?.file_type]);

  const loadContent = async (storagePath: string, fileType: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // For PDFs, just get download URL
      if (fileType === 'pdf') {
        const { data } = await supabase.storage
          .from('user-knowledge-files')
          .createSignedUrl(storagePath, 3600);
        
        if (data?.signedUrl) {
          setDownloadUrl(data.signedUrl);
        }
        setContent('');
      } else {
        // For text-based files, fetch content
        const { data } = await supabase.storage
          .from('user-knowledge-files')
          .createSignedUrl(storagePath, 3600);

        if (data?.signedUrl) {
          setDownloadUrl(data.signedUrl);
          const response = await fetch(data.signedUrl);
          if (!response.ok) {
            throw new Error('Failed to load file content');
          }
          const text = await response.text();
          setContent(text);
        }
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setError('Could not load file content.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-destructive" />;
      case 'json':
        return <FileJson className="h-5 w-5 text-primary" />;
      case 'markdown':
        return <FileCode className="h-5 w-5 text-muted-foreground" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const renderMarkdown = (md: string) => {
    return md.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-semibold mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('- ')) {
        const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: text }} />;
      }
      if (/^\d+\. /.test(line)) {
        return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      const text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: text }} />;
    });
  };

  const handleCopyAsMarkdown = async () => {
    if (!content) {
      toast.error('No content to copy');
      return;
    }
    await navigator.clipboard.writeText(content);
    toast.success('Document copied to clipboard');
  };

  const handleContentSaved = () => {
    // Reload content after save
    if (file?.storage_path) {
      loadContent(file.storage_path, file.file_type);
    }
  };

  const renderContent = () => {
    if (!file) return null;

    if (file.file_type === 'pdf') {
      return (
        <div className="w-full h-[60vh]">
          {downloadUrl ? (
            <iframe
              src={downloadUrl}
              className="w-full h-full border-0 rounded-lg"
              title={file.title}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          )}
        </div>
      );
    }

    if (file.file_type === 'json') {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">{content}</pre>;
      }
    }

    return <div className="prose prose-sm max-w-none dark:prose-invert">{renderMarkdown(content)}</div>;
  };

  if (!file) return null;

  const isEditable = file.file_type !== 'pdf';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(file.file_type)}
                <DialogTitle className="text-left truncate">{file.title}</DialogTitle>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAsMarkdown}
                  disabled={!content || file.file_type === 'pdf'}
                  title={file.file_type === 'pdf' ? 'PDF content cannot be copied as text' : undefined}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy as Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(file);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Metadata
                </Button>
              </div>
            </div>
            {file.description && (
              <p className="text-sm text-muted-foreground mt-2">{file.description}</p>
            )}
          </DialogHeader>

          {/* Metadata Section */}
          <div className="flex flex-wrap gap-4 text-sm border-y py-3">
            {file.department && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{file.department}</span>
              </div>
            )}
            {file.audience && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{file.audience}</span>
              </div>
            )}
            {file.sensitivity && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>{file.sensitivity}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(file.created_at).toLocaleDateString()}</span>
            </div>
            {file.version && (
              <Badge variant="secondary">v{file.version}</Badge>
            )}
          </div>

          {/* Tags */}
          {file.tags && file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {file.tags.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : (
            <div className="relative group">
              {/* Hover edit button - only for editable files */}
              {isEditable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditContentOpen(true)}
                  className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <FileEdit className="mr-2 h-4 w-4" />
                  Edit Content
                </Button>
              )}
              <ScrollArea className="h-[50vh] rounded-md border p-4">
                {renderContent()}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditKnowledgeContentDialog
        open={editContentOpen}
        onOpenChange={setEditContentOpen}
        file={file}
        initialContent={content}
        onSaved={handleContentSaved}
      />
    </>
  );
}
