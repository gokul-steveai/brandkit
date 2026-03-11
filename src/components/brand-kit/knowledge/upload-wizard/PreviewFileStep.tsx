import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, FileJson, FileCode } from 'lucide-react';
import { UploadedFile } from './types';

interface PreviewFileStepProps {
  uploadedFile: UploadedFile;
  onBack: () => void;
  onContinue: () => void;
}

export function PreviewFileStep({ uploadedFile, onBack, onContinue }: PreviewFileStepProps) {
  const previewContent = useMemo(() => {
    const { fileType, content, file } = uploadedFile;

    if (fileType === 'pdf') {
      // Create object URL for PDF preview
      const objectUrl = file ? URL.createObjectURL(file) : null;
      return (
        <div className="w-full h-[400px] rounded-lg overflow-hidden border bg-muted">
          {objectUrl ? (
            <iframe
              src={objectUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">PDF preview not available</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (fileType === 'json') {
      let formattedJson = content || '';
      try {
        const parsed = JSON.parse(content || '');
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep original content if parsing fails
      }

      return (
        <div className="w-full h-[400px] rounded-lg overflow-hidden border bg-muted">
          <pre className="p-4 overflow-auto h-full text-sm font-mono whitespace-pre-wrap break-all">
            <code className="language-json block">{formattedJson}</code>
          </pre>
        </div>
      );
    }

    // Markdown - show raw text
    return (
      <div className="w-full h-[400px] rounded-lg overflow-hidden border bg-muted">
        <pre className="p-4 overflow-auto h-full text-sm font-mono whitespace-pre-wrap">
          {content || 'No content available'}
        </pre>
      </div>
    );
  }, [uploadedFile]);

  const getFileIcon = () => {
    switch (uploadedFile.fileType) {
      case 'pdf': return <FileText className="h-5 w-5 text-destructive" />;
      case 'json': return <FileJson className="h-5 w-5 text-primary" />;
      case 'markdown': return <FileCode className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getFileTypeLabel = () => {
    switch (uploadedFile.fileType) {
      case 'pdf': return 'PDF Document';
      case 'json': return 'JSON File';
      case 'markdown': return 'Markdown File';
    }
  };

  return (
    <div className="space-y-4 overflow-hidden min-w-0">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{uploadedFile.originalFileName}</p>
          <p className="text-sm text-muted-foreground">{getFileTypeLabel()}</p>
        </div>
      </div>

      {previewContent}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue}>
          Continue to Metadata
        </Button>
      </div>
    </div>
  );
}
