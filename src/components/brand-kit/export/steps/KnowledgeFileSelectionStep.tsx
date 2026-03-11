import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileText, Upload, Library, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface KnowledgeFileOption {
  id: string;
  title: string;
  source: 'user' | 'template' | 'auto-generated';
  fileType: string;
  description?: string;
}

interface KnowledgeFileSelectionStepProps {
  selectedFileIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function KnowledgeFileSelectionStep({ selectedFileIds, onSelectionChange }: KnowledgeFileSelectionStepProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const [files, setFiles] = useState<KnowledgeFileOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      if (!brandKitId) return;
      setIsLoading(true);

      const allFiles: KnowledgeFileOption[] = [];

      // 1. User-uploaded files
      const { data: userFiles } = await supabase
        .from('user_knowledge_file_uploads')
        .select('id, title, file_type, is_ai_generated_metadata, description')
        .eq('brand_kit_id', brandKitId);

      if (userFiles) {
        for (const f of userFiles) {
          allFiles.push({
            id: `user:${f.id}`,
            title: f.title,
            source: f.is_ai_generated_metadata ? 'auto-generated' : 'user',
            fileType: f.file_type,
            description: f.description || undefined,
          });
        }
      }

      // 2. Selected library templates
      const { data: templateLinks } = await supabase
        .from('brand_kit_knowledge_files')
        .select('id, custom_reference_name, library_knowledge_files(id, display_name, file_type, description)')
        .eq('brand_kit_id', brandKitId);

      if (templateLinks) {
        for (const link of templateLinks) {
          const lib = link.library_knowledge_files as any;
          if (lib) {
            allFiles.push({
              id: `template:${link.id}`,
              title: link.custom_reference_name || lib.display_name,
              source: 'template',
              fileType: lib.file_type,
              description: lib.description || undefined,
            });
          }
        }
      }

      setFiles(allFiles);

      // Auto-select all on first load if no selection exists
      if (selectedFileIds.length === 0 && allFiles.length > 0) {
        onSelectionChange(allFiles.map(f => f.id));
      }

      setIsLoading(false);
    }
    fetchFiles();
  }, [brandKitId]);

  const handleToggle = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      onSelectionChange(selectedFileIds.filter(id => id !== fileId));
    } else {
      onSelectionChange([...selectedFileIds, fileId]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(files.map(f => f.id));
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const getSourceIcon = (source: KnowledgeFileOption['source']) => {
    switch (source) {
      case 'user': return <Upload className="h-4 w-4" />;
      case 'template': return <Library className="h-4 w-4" />;
      case 'auto-generated': return <Sparkles className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: KnowledgeFileOption['source']) => {
    switch (source) {
      case 'user': return 'Uploaded';
      case 'template': return 'Template';
      case 'auto-generated': return 'Auto-generated';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading knowledge files...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-1">Select Knowledge Files</h3>
        <p className="text-sm text-muted-foreground">
          Choose which knowledge files to include in your export. Selected files will appear in the Knowledge tab and be referenced in the system instructions.
        </p>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No knowledge files found for this brand kit.</p>
          <p className="text-xs mt-1">Add knowledge files in the Knowledge section first.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedFileIds.length} of {files.length} selected
            </span>
            <div className="flex gap-2">
              <button className="text-primary hover:underline text-xs" onClick={handleSelectAll}>
                Select all
              </button>
              <span className="text-muted-foreground">|</span>
              <button className="text-primary hover:underline text-xs" onClick={handleDeselectAll}>
                Deselect all
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {files.map((file) => (
              <Card
                key={file.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedFileIds.includes(file.id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                }`}
                onClick={() => handleToggle(file.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedFileIds.includes(file.id)}
                    onCheckedChange={() => handleToggle(file.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{file.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1">
                        {getSourceIcon(file.source)}
                        {getSourceLabel(file.source)}
                      </Badge>
                    </div>
                    {file.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{file.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
