import { useState } from 'react';
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
import { ArrowLeft, Sparkles, Loader2, Lock, FileText, Info } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { TagInput } from './TagInput';
import { 
  FileMetadata, 
  UploadedFile, 
  ReportCategory, 
  PlatformContext,
  REPORT_CATEGORY_OPTIONS,
  PLATFORM_CONTEXT_OPTIONS 
} from './types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MetadataStepProps {
  uploadedFile: UploadedFile;
  metadata: FileMetadata;
  onMetadataChange: (metadata: FileMetadata) => void;
  onBack: () => void;
  onSubmit: (isAiGenerated: boolean) => void;
  isSubmitting: boolean;
}

export function MetadataStep({
  uploadedFile,
  metadata,
  onMetadataChange,
  onBack,
  onSubmit,
  isSubmitting,
}: MetadataStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { subscription } = useSubscription();
  
  const isPaidUser = subscription?.subscription_tier === 'base' || subscription?.subscription_tier === 'premium';
  const isAnalysisReport = metadata.category !== 'general';

  const updateField = <K extends keyof FileMetadata>(field: K, value: FileMetadata[K]) => {
    onMetadataChange({ ...metadata, [field]: value });
  };

  const handleAiGenerate = async () => {
    if (!isPaidUser) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-file-metadata', {
        body: {
          fileContent: uploadedFile.content,
          fileName: uploadedFile.originalFileName,
          fileType: uploadedFile.fileType,
        },
      });

      if (error) throw error;

      if (data?.metadata) {
        onMetadataChange({
          ...metadata,
          title: data.metadata.title || metadata.title,
          description: data.metadata.description,
          tags: data.metadata.tags || [],
          department: data.metadata.department,
          sensitivity: data.metadata.sensitivity || 'Internal',
          audience: data.metadata.audience,
          source: data.metadata.source,
          attribution: data.metadata.attribution,
          related_projects: data.metadata.related_projects || [],
        });
        toast({ title: 'Metadata generated', description: 'AI has analyzed your document' });
      }
    } catch (error) {
      console.error('Error generating metadata:', error);
      toast({ 
        title: 'Generation failed', 
        description: 'Could not generate metadata. Please fill in manually.',
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (!metadata.title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a document title', variant: 'destructive' });
      return;
    }
    onSubmit(isGenerating);
  };

  return (
    <div className="space-y-6">
      {/* Report Category Section */}
      <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Document Classification</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Report Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Document Type</Label>
            <Select
              value={metadata.category}
              onValueChange={(value) => updateField('category', value as ReportCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {REPORT_CATEGORY_OPTIONS.find(o => o.value === metadata.category)?.description}
            </p>
          </div>

          {/* Platform Context */}
          <div className="space-y-2">
            <Label htmlFor="platform_context">Platform Context</Label>
            <Select
              value={metadata.platform_context}
              onValueChange={(value) => updateField('platform_context', value as PlatformContext)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_CONTEXT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {metadata.platform_context === 'universal' 
                ? 'Applies to all platforms' 
                : `Specific to ${PLATFORM_CONTEXT_OPTIONS.find(o => o.value === metadata.platform_context)?.label}`}
            </p>
          </div>
        </div>

        {isAnalysisReport && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analysis reports can be used to enhance your brand kit. After upload, you'll be able to compare and import insights into your brand kit sections.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* AI Generate Button */}
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  onClick={handleAiGenerate}
                  disabled={!isPaidUser || isGenerating || uploadedFile.fileType === 'pdf'}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isPaidUser ? (
                    <Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  Auto-generate with AI
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {!isPaidUser ? (
                <p>Upgrade to Base or Premium to unlock AI-powered metadata generation</p>
              ) : uploadedFile.fileType === 'pdf' ? (
                <p>AI metadata generation is not available for PDF files</p>
              ) : (
                <p>Let AI analyze your document and suggest metadata</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Title (required) */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={metadata.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Document title"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={metadata.description || ''}
          onChange={(e) => updateField('description', e.target.value || null)}
          placeholder="Brief description of the document"
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput
          value={metadata.tags}
          onChange={(tags) => updateField('tags', tags)}
          placeholder="Add relevant tags..."
        />
      </div>

      {/* Two column layout for smaller fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={metadata.department || ''}
            onChange={(e) => updateField('department', e.target.value || null)}
            placeholder="e.g., Marketing"
          />
        </div>

        {/* Version */}
        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={metadata.version}
            onChange={(e) => updateField('version', e.target.value)}
            placeholder="1.0"
          />
        </div>

        {/* Sensitivity */}
        <div className="space-y-2">
          <Label htmlFor="sensitivity">Sensitivity</Label>
          <Select
            value={metadata.sensitivity}
            onValueChange={(value) => updateField('sensitivity', value as FileMetadata['sensitivity'])}
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

        {/* Audience */}
        <div className="space-y-2">
          <Label htmlFor="audience">Audience</Label>
          <Input
            id="audience"
            value={metadata.audience || ''}
            onChange={(e) => updateField('audience', e.target.value || null)}
            placeholder="e.g., Executives, Team"
          />
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={metadata.source || ''}
            onChange={(e) => updateField('source', e.target.value || null)}
            placeholder="Where this came from"
          />
        </div>

        {/* Attribution */}
        <div className="space-y-2">
          <Label htmlFor="attribution">Attribution</Label>
          <Input
            id="attribution"
            value={metadata.attribution || ''}
            onChange={(e) => updateField('attribution', e.target.value || null)}
            placeholder="Credit/author"
          />
        </div>
      </div>

      {/* Related Projects */}
      <div className="space-y-2">
        <Label>Related Projects</Label>
        <TagInput
          value={metadata.related_projects}
          onChange={(projects) => updateField('related_projects', projects)}
          placeholder="Add related project..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
      </div>
    </div>
  );
}
