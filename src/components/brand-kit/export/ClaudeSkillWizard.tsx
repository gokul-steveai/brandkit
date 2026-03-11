import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionSelectionStep } from './steps/SectionSelectionStep';
import { ClaudeSkillResults } from './ClaudeSkillResults';
import { 
  ClaudeSkillExportConfig, 
  DEFAULT_CLAUDE_SKILL_CONFIG, 
  ClaudeSkillExportResult,
  SectionCompleteness,
} from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

interface TemplateKnowledgeFile {
  id: string;
  display_name: string;
  description: string;
}

interface ClaudeSkillWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingExportId?: string | null;
}

type WizardStep = 'sections' | 'review' | 'results';

const STEP_ORDER: WizardStep[] = ['sections', 'review'];

const STEP_TITLES: Record<WizardStep, string> = {
  sections: 'Select Sections',
  review: 'Review & Generate',
  results: 'Your Claude Skill',
};

export function ClaudeSkillWizard({ open, onOpenChange, existingExportId }: ClaudeSkillWizardProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('sections');
  const [config, setConfig] = useState<ClaudeSkillExportConfig>(DEFAULT_CLAUDE_SKILL_CONFIG);
  const [sectionCompleteness, setSectionCompleteness] = useState<SectionCompleteness[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportResult, setExportResult] = useState<ClaudeSkillExportResult | null>(null);
  const [templates, setTemplates] = useState<TemplateKnowledgeFile[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Fetch curated templates
  useEffect(() => {
    async function fetchTemplates() {
      const { data } = await supabase
        .from('library_knowledge_files')
        .select('id, display_name, description')
        .eq('file_type', 'curated_template')
        .eq('is_library', true);
      
      if (data) {
        setTemplates(data);
      }
    }
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  // Load existing export if viewing
  useEffect(() => {
    if (open && existingExportId && brandKitId) {
      loadExistingExport(existingExportId);
    }
  }, [open, existingExportId]);

  const loadExistingExport = async (exportId: string) => {
    setIsLoadingExisting(true);
    try {
      const { data: exportRecord, error } = await supabase
        .from('brand_kit_exports')
        .select('*')
        .eq('id', exportId)
        .single();

      if (error || !exportRecord) throw new Error('Export not found');

      // Download the skill content from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('brand-kit-exports')
        .download(exportRecord.storage_path);

      if (dlError) throw dlError;

      const skillMd = await fileData.text();

      setExportResult({
        skillMd,
        zipBase64: '', // Not available from storage, user will need to regenerate for ZIP
        description: exportRecord.description || '',
        metadata: {
          brandName: exportRecord.title.replace(/Claude Skill Export - .*/, '').trim() || exportRecord.reference_name,
          generatedAt: exportRecord.updated_at || exportRecord.created_at || '',
          sectionsIncluded: (exportRecord.sections_included as string[]) || [],
          filesIncluded: ['SKILL.md'],
        },
      });
      setCurrentStep('results');
    } catch (err) {
      console.error('Error loading existing export:', err);
      toast({
        title: 'Could not load export',
        description: 'The saved export could not be loaded.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = currentStep === 'results' ? 100 : ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const handleNext = () => {
    if (currentStep === 'sections') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      setCurrentStep('sections');
    }
  };

  const handleGenerate = async () => {
    if (!brandKitId) return;
    
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-claude-skill', {
        body: { brandKitId, config }
      });

      if (error) throw error;

      setExportResult(data);
      setCurrentStep('results');
      
      toast({
        title: 'Claude Skill generated',
        description: 'Your skill is ready to download.',
      });
    } catch (error) {
      console.error('Error generating Claude Skill:', error);
      toast({
        title: 'Error generating skill',
        description: 'Failed to generate Claude Skill. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('sections');
    setConfig(DEFAULT_CLAUDE_SKILL_CONFIG);
    setExportResult(null);
    onOpenChange(false);
  };

  const canProceed = () => {
    if (currentStep === 'sections') {
      return config.selectedSections.length > 0;
    }
    return true;
  };

  const renderStep = () => {
    if (isLoadingExisting) {
      return (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading saved export...</span>
        </div>
      );
    }

    switch (currentStep) {
      case 'sections':
        return (
          <div className="space-y-6">
            <SectionSelectionStep
              selectedSections={config.selectedSections}
              onSectionsChange={(sections) => setConfig(prev => ({ ...prev, selectedSections: sections }))}
              onCompletenessCalculated={setSectionCompleteness}
            />
            
            <Card className="p-4 space-y-4">
              <h4 className="font-medium">Include Resources</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-logos" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Logo Files</p>
                      <p className="text-xs text-muted-foreground">Include brand logos in the skill</p>
                    </div>
                  </Label>
                  <Switch
                    id="include-logos"
                    checked={config.includeLogos}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeLogos: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-fonts" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Typography Reference</p>
                      <p className="text-xs text-muted-foreground">Include font specifications</p>
                    </div>
                  </Label>
                  <Switch
                    id="include-fonts"
                    checked={config.includeFonts}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeFonts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-knowledge" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Knowledge Files</p>
                      <p className="text-xs text-muted-foreground">Include uploaded reference documents</p>
                    </div>
                  </Label>
                  <Switch
                    id="include-knowledge"
                    checked={config.includeKnowledgeFiles}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeKnowledgeFiles: checked }))}
                  />
                </div>
              </div>
            </Card>

            {templates.length > 0 && (
              <Card className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium">Governance Templates</h4>
                  <p className="text-xs text-muted-foreground">Include curated AI governance documents</p>
                </div>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-start gap-3">
                      <Checkbox
                        id={template.id}
                        checked={config.selectedTemplateIds.includes(template.id)}
                        onCheckedChange={(checked) => {
                          setConfig(prev => ({
                            ...prev,
                            selectedTemplateIds: checked
                              ? [...prev.selectedTemplateIds, template.id]
                              : prev.selectedTemplateIds.filter(id => id !== template.id)
                          }));
                        }}
                      />
                      <Label htmlFor={template.id} className="cursor-pointer flex-1">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{template.display_name}</p>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        );
      
      case 'review':
        return (
          <div className="space-y-6">
            <Card className="p-4">
              <h4 className="font-medium mb-3">What will be included</h4>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <strong>Sections:</strong> {config.selectedSections.length} selected
                </p>
                <ul className="list-disc list-inside text-muted-foreground ml-2">
                  {config.selectedSections.map(section => (
                    <li key={section} className="capitalize">{section.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-3">Resources</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {config.includeLogos && <li>✓ Logo files (logo, dark logo, favicon)</li>}
                {config.includeFonts && <li>✓ Typography specifications</li>}
                {config.includeKnowledgeFiles && <li>✓ Knowledge documents</li>}
                {config.selectedTemplateIds.length > 0 && (
                  <li>✓ {config.selectedTemplateIds.length} governance template{config.selectedTemplateIds.length > 1 ? 's' : ''}</li>
                )}
                {!config.includeLogos && !config.includeFonts && !config.includeKnowledgeFiles && config.selectedTemplateIds.length === 0 && (
                  <li className="text-muted-foreground/60">No additional resources selected</li>
                )}
              </ul>
            </Card>

            <Card className="p-4 bg-muted/50">
              <h4 className="font-medium mb-2">AI-Generated Description</h4>
              <p className="text-sm text-muted-foreground">
                A concise description (max 200 characters) will be automatically generated based on your brand information.
              </p>
            </Card>
          </div>
        );

      case 'results':
        return exportResult && (
          <ClaudeSkillResults
            result={exportResult}
            brandKitId={brandKitId || ''}
            onClose={handleClose}
            onRegenerate={handleGenerate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[currentStep]}</DialogTitle>
          {currentStep !== 'results' && (
            <Progress value={progress} className="h-1 mt-2" />
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {renderStep()}
        </div>

        {currentStep !== 'results' && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'sections'}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : currentStep === 'review' ? (
                'Generate Skill'
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
