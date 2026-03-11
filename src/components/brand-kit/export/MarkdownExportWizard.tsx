import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, FolderOpen, ArrowRight, ArrowLeft, Files } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { exportApi } from '@/lib/api/export';
import { MarkdownExportResults } from './MarkdownExportResults';
import { EXPORT_SECTIONS, MarkdownExportConfig, MarkdownExportResult, DEFAULT_MARKDOWN_EXPORT_CONFIG } from './types';

interface MarkdownExportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface KnowledgeTemplate {
  id: string;
  library_file_id: string;
  custom_reference_name: string | null;
  library_knowledge_files: {
    id: string;
    display_name: string;
    reference_name: string;
    description: string | null;
  };
}

type WizardStep = 'sections' | 'templates' | 'review' | 'results';

export function MarkdownExportWizard({ open, onOpenChange }: MarkdownExportWizardProps) {
  const { brandKitId } = useParams<{ brandKitId: string }>();
  const { toast } = useToast();
  
  const [step, setStep] = useState<WizardStep>('sections');
  const [config, setConfig] = useState<MarkdownExportConfig>(DEFAULT_MARKDOWN_EXPORT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<MarkdownExportResult | null>(null);
  const [templates, setTemplates] = useState<KnowledgeTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Fetch templates when wizard opens
  useEffect(() => {
    if (open && brandKitId) {
      fetchTemplates();
    }
  }, [open, brandKitId]);

  const fetchTemplates = async () => {
    if (!brandKitId) return;
    
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('brand_kit_knowledge_files')
        .select(`
          id,
          library_file_id,
          custom_reference_name,
          library_knowledge_files (
            id,
            display_name,
            reference_name,
            description
          )
        `)
        .eq('brand_kit_id', brandKitId);

      if (error) throw error;
      setTemplates((data || []) as unknown as KnowledgeTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedSections: prev.selectedSections.includes(sectionId)
        ? prev.selectedSections.filter(id => id !== sectionId)
        : [...prev.selectedSections, sectionId]
    }));
  };

  const handleTemplateToggle = (templateId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedTemplateIds: prev.selectedTemplateIds.includes(templateId)
        ? prev.selectedTemplateIds.filter(id => id !== templateId)
        : [...prev.selectedTemplateIds, templateId]
    }));
  };

  const handleSelectAllSections = () => {
    const allSectionIds = EXPORT_SECTIONS.map(s => s.id);
    setConfig(prev => ({
      ...prev,
      selectedSections: prev.selectedSections.length === allSectionIds.length ? [] : allSectionIds
    }));
  };

  const handleSelectAllTemplates = () => {
    const allTemplateIds = templates.map(t => t.library_file_id);
    setConfig(prev => ({
      ...prev,
      selectedTemplateIds: prev.selectedTemplateIds.length === allTemplateIds.length ? [] : allTemplateIds
    }));
  };

  const handleGenerate = async () => {
    if (!brandKitId) {
      toast({
        title: 'Error',
        description: 'Brand kit ID is required',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const exportResult = await exportApi.generateMarkdownExport(brandKitId, config);
      setResult(exportResult);
      setStep('results');
    } catch (error) {
      console.error('Markdown export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to generate markdown export',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setStep('sections');
    setConfig(DEFAULT_MARKDOWN_EXPORT_CONFIG);
    setResult(null);
    onOpenChange(false);
  };

  const getPreviewStructure = () => {
    const structure: string[] = ['README.md'];
    
    if (config.selectedSections.includes('core')) {
      structure.push('core.md');
    }
    if (config.selectedSections.includes('personality')) {
      structure.push('personality.md');
    }
    if (config.selectedSections.includes('expression')) {
      structure.push('expression.md');
    }
    if (config.selectedSections.includes('governance')) {
      structure.push('governance.md');
    }
    if (config.selectedSections.includes('products')) {
      structure.push('products.md');
    }
    if (config.selectedSections.includes('audience')) {
      structure.push('audience.md');
    }

    // Add templates
    if (config.selectedTemplateIds.length > 0) {
      config.selectedTemplateIds.forEach(templateId => {
        const template = templates.find(t => t.library_file_id === templateId);
        if (template) {
          const name = (template.library_knowledge_files.reference_name || template.library_knowledge_files.display_name)
            .replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
          structure.push(`templates/${name}.md`);
        }
      });
    }
    
    return structure;
  };

  const renderStep = () => {
    switch (step) {
      case 'sections':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select which sections to include in your markdown export.
              </p>
              <Button variant="ghost" size="sm" onClick={handleSelectAllSections}>
                {config.selectedSections.length === EXPORT_SECTIONS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {EXPORT_SECTIONS.map((section) => (
                  <Card 
                    key={section.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      config.selectedSections.includes(section.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSectionToggle(section.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={config.selectedSections.includes(section.id)}
                        onCheckedChange={() => handleSectionToggle(section.id)}
                      />
                      <div className="flex-1">
                        <Label className="font-medium cursor-pointer">{section.name}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('templates')}
                disabled={config.selectedSections.length === 0}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Files className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Optionally include knowledge file templates.
                </p>
              </div>
              {templates.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAllTemplates}>
                  {config.selectedTemplateIds.length === templates.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[300px] pr-4">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Files className="h-8 w-8 mb-2" />
                  <p className="text-sm">No templates attached to this brand kit</p>
                  <p className="text-xs mt-1">You can add templates from the Knowledge Files page</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        config.selectedTemplateIds.includes(template.library_file_id) 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleTemplateToggle(template.library_file_id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={config.selectedTemplateIds.includes(template.library_file_id)}
                          onCheckedChange={() => handleTemplateToggle(template.library_file_id)}
                        />
                        <div className="flex-1">
                          <Label className="font-medium cursor-pointer">
                            {template.custom_reference_name || template.library_knowledge_files.display_name}
                          </Label>
                          {template.library_knowledge_files.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {template.library_knowledge_files.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('sections')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('review')}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
              <p className="text-sm">Preview of files to be generated:</p>
            </div>

            <Card className="p-4">
              <ScrollArea className="h-[200px]">
                <pre className="text-sm font-mono">
                  {`brand-kit/\n${getPreviewStructure().map(f => `├── ${f}`).join('\n')}`}
                </pre>
              </ScrollArea>
            </Card>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{config.selectedSections.length}</strong> sections • 
                <strong> {config.selectedTemplateIds.length}</strong> templates • 
                <strong> {getPreviewStructure().length}</strong> files total
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="includeVisualIdentity"
                checked={config.includeVisualIdentity}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, includeVisualIdentity: !!checked }))
                }
              />
              <Label htmlFor="includeVisualIdentity" className="cursor-pointer">
                Include visual identity (colors, fonts) in README
              </Label>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('templates')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Export
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'results':
        return result ? (
          <MarkdownExportResults 
            result={result} 
            brandKitId={brandKitId || ''} 
            onClose={handleClose} 
          />
        ) : null;
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'sections':
        return 'Select brand kit sections to export as organized markdown files.';
      case 'templates':
        return 'Choose knowledge file templates to include.';
      case 'review':
        return 'Review the file structure before generating your export.';
      case 'results':
        return 'Your markdown files are ready to download.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export as Markdown
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
