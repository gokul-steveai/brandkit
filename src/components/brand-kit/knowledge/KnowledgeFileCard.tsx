import { FileText, Download, Info, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface LibraryKnowledgeFile {
  id: string;
  reference_name: string;
  display_name: string;
  description: string | null;
  file_type: string;
  system_instruction_hint: string | null;
  storage_path?: string | null;
}

interface KnowledgeFileCardProps {
  file: LibraryKnowledgeFile;
  isSelected: boolean;
  onToggle: () => void;
  showDownload?: boolean;
  disabled?: boolean;
  onPreview?: (file: LibraryKnowledgeFile) => void;
}

export function KnowledgeFileCard({ 
  file, 
  isSelected, 
  onToggle, 
  showDownload = false,
  disabled = false,
  onPreview,
}: KnowledgeFileCardProps) {
  return (
    <Card 
      className={`border-2 transition-colors ${
        disabled 
          ? 'border-border opacity-60' 
          : isSelected 
            ? 'border-primary' 
            : 'border-border'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{file.display_name}</CardTitle>
              <code className="text-xs text-muted-foreground">{file.reference_name}</code>
            </div>
          </div>
          <Switch 
            checked={isSelected}
            onCheckedChange={onToggle}
            disabled={disabled}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {file.description && (
          <p className="text-sm text-muted-foreground">{file.description}</p>
        )}
        {file.system_instruction_hint && (
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">
              <strong>System hint:</strong> {file.system_instruction_hint}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          {file.storage_path && onPreview && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onPreview(file)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          {showDownload && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              disabled
            >
              <Download className="mr-2 h-4 w-4" />
              Generate PDF (Coming Soon)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
