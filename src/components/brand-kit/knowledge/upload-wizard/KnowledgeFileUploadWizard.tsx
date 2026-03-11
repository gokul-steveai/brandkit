import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SelectFileStep } from './SelectFileStep';
import { PreviewFileStep } from './PreviewFileStep';
import { MetadataStep } from './MetadataStep';
import { 
  WizardState, 
  UploadedFile, 
  FileMetadata, 
  defaultMetadata,
  FileType 
} from './types';

interface KnowledgeFileUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  onUploadComplete: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function KnowledgeFileUploadWizard({
  open,
  onOpenChange,
  brandKitId,
  onUploadComplete,
}: KnowledgeFileUploadWizardProps) {
  const { profile } = useUserProfile();
  const [state, setState] = useState<WizardState>({
    step: 'select',
    uploadedFile: null,
    metadata: { ...defaultMetadata },
    isAiGenerated: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetWizard = () => {
    setState({
      step: 'select',
      uploadedFile: null,
      metadata: { ...defaultMetadata },
      isAiGenerated: false,
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const handleFileSelected = (file: UploadedFile) => {
    // Pre-populate title from filename
    const titleFromFile = file.originalFileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words

    setState(prev => ({
      ...prev,
      uploadedFile: file,
      metadata: {
        ...prev.metadata,
        title: titleFromFile,
      },
      step: 'preview',
    }));
  };

  const buildStoragePath = (metadata: FileMetadata, fileType: FileType): string => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = MONTH_NAMES[now.getMonth()];
    
    // Get author name from profile
    const authorName = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';
    
    // Build path components with graceful fallback
    const pathComponents: string[] = [];
    
    if (metadata.department) {
      pathComponents.push(metadata.department.replace(/[^a-zA-Z0-9\s]/g, '').trim());
    }
    
    pathComponents.push(authorName.replace(/[^a-zA-Z0-9\s]/g, '').trim());
    pathComponents.push(year);
    pathComponents.push(month);
    
    // Build filename: TYPE-YEAR-MONTH-Department-Topic-vVERSION.ext
    const fileExt = fileType === 'markdown' ? 'md' : fileType;
    const sanitizedTitle = metadata.title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    
    const typePrefix = fileType.toUpperCase();
    const monthNum = String(now.getMonth() + 1).padStart(2, '0');
    const deptPart = metadata.department ? `-${metadata.department.replace(/\s+/g, '-')}` : '';
    
    const fileName = `${typePrefix}-${year}-${monthNum}${deptPart}-${sanitizedTitle}-v${metadata.version}.${fileExt}`;
    
    // Join path: department/author/year/month/filename
    const fullPath = [...pathComponents, fileName].join('/').replace(/\s+/g, '-');
    
    return fullPath;
  };

  const generateDocId = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DOC-${year}-${month}-${random}`;
  };

  const handleSubmit = async (isAiGenerated: boolean) => {
    if (!state.uploadedFile?.file) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const storagePath = buildStoragePath(state.metadata, state.uploadedFile.fileType);
      const fullStoragePath = `${brandKitId}/${user.id}/${storagePath}`;

      // Map fileType to MIME type for storage
      const contentType = state.uploadedFile.fileType === 'pdf' ? 'application/pdf' 
        : state.uploadedFile.fileType === 'json' ? 'application/json' 
        : 'text/markdown';

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('user-knowledge-files')
        .upload(fullStoragePath, state.uploadedFile.file, {
          cacheControl: '3600',
          upsert: false,
          contentType,
        });

      if (uploadError) throw uploadError;

      // Insert metadata into database
      const { error: dbError } = await supabase
        .from('user_knowledge_file_uploads')
        .insert({
          brand_kit_id: brandKitId,
          user_id: user.id,
          title: state.metadata.title,
          doc_id: generateDocId(),
          original_file_name: state.uploadedFile.originalFileName,
          file_type: state.uploadedFile.fileType,
          storage_path: fullStoragePath,
          version: state.metadata.version,
          source: state.metadata.source,
          department: state.metadata.department,
          tags: state.metadata.tags,
          sensitivity: state.metadata.sensitivity,
          attribution: state.metadata.attribution,
          audience: state.metadata.audience,
          related_projects: state.metadata.related_projects,
          description: state.metadata.description,
          is_ai_generated_metadata: isAiGenerated,
          file_size_bytes: state.uploadedFile.file.size,
          category: state.metadata.category,
          platform_context: state.metadata.platform_context,
        });

      if (dbError) throw dbError;

      toast({ title: 'Document uploaded', description: `${state.metadata.title} has been added to your knowledge base` });
      handleClose();
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Upload failed', 
        description: error instanceof Error ? error.message : 'Could not upload the document',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepProgress = state.step === 'select' ? 33 : state.step === 'preview' ? 66 : 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {state.step === 'select' && 'Upload Knowledge Document'}
            {state.step === 'preview' && 'Preview Document'}
            {state.step === 'metadata' && 'Document Metadata'}
          </DialogTitle>
        </DialogHeader>

        <Progress value={stepProgress} className="mb-4" />

        {state.step === 'select' && (
          <SelectFileStep onFileSelected={handleFileSelected} />
        )}

        {state.step === 'preview' && state.uploadedFile && (
          <PreviewFileStep
            uploadedFile={state.uploadedFile}
            onBack={() => setState(prev => ({ ...prev, step: 'select', uploadedFile: null }))}
            onContinue={() => setState(prev => ({ ...prev, step: 'metadata' }))}
          />
        )}

        {state.step === 'metadata' && state.uploadedFile && (
          <MetadataStep
            uploadedFile={state.uploadedFile}
            metadata={state.metadata}
            onMetadataChange={(metadata) => setState(prev => ({ ...prev, metadata }))}
            onBack={() => setState(prev => ({ ...prev, step: 'preview' }))}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
