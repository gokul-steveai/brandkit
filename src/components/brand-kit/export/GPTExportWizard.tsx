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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionSelectionStep } from './steps/SectionSelectionStep';
import { GapFillingStep } from './steps/GapFillingStep';
import { PersonaSelectionStep } from './steps/PersonaSelectionStep';
import { KnowledgeFileSelectionStep } from './steps/KnowledgeFileSelectionStep';
import { RestrictionsStep } from './steps/RestrictionsStep';
import { ReviewGenerateStep } from './steps/ReviewGenerateStep';
import { GPTExportResults } from './GPTExportResults';
import { 
  GPTExportConfig, 
  DEFAULT_GPT_EXPORT_CONFIG, 
  GPTExportResult,
} from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

interface GPTExportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingExportId?: string | null;
}

type WizardStep = 'sections' | 'gaps' | 'persona' | 'knowledge' | 'restrictions' | 'review' | 'results';

const STEP_ORDER: WizardStep[] = ['sections', 'gaps', 'persona', 'knowledge', 'restrictions', 'review'];

const STEP_TITLES: Record<WizardStep, string> = {
  sections: 'Select Sections',
  gaps: 'Fill Missing Data',
  persona: 'Select Persona',
  knowledge: 'Select Knowledge Files',
  restrictions: 'Restrictions',
  review: 'Review & Generate',
  results: 'Export Results',
};

export function GPTExportWizard({ open, onOpenChange, existingExportId }: GPTExportWizardProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('sections');
  const [config, setConfig] = useState<GPTExportConfig>(DEFAULT_GPT_EXPORT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportResult, setExportResult] = useState<GPTExportResult | null>(null);
  const [skipGapsStep, setSkipGapsStep] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

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

      // Download the system instructions from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('brand-kit-exports')
        .download(exportRecord.storage_path);

      if (dlError) throw dlError;

      const systemInstructions = await fileData.text();
      const savedConfig = exportRecord.export_config as any;

      setExportResult({
        systemInstructions,
        userPromptTemplate: '',
        knowledgeFile: {},
        recommendedKnowledgeFiles: [],
        conversationStarters: [],
        metadata: {
          title: exportRecord.title,
          description: exportRecord.description || '',
          referenceName: exportRecord.reference_name,
          exportType: 'chatgpt_custom_gpt',
          exportFormat: 'markdown',
          sectionsIncluded: (exportRecord.sections_included as string[]) || [],
          exportConfig: savedConfig || DEFAULT_GPT_EXPORT_CONFIG,
          gapsFilled: (exportRecord.gaps_filled as string[]) || [],
          metaTags: (exportRecord.meta_tags as string[]) || [],
          contentSummary: exportRecord.content_summary || undefined,
        },
      });
      if (savedConfig) {
        setConfig(savedConfig);
      }
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

  const hasGaps = (config.sectionCompleteness ?? []).some(
    c => config.selectedSections.includes(c.sectionId) && c.completenessPercent < 100
  );

  const getNextStep = (current: WizardStep): WizardStep => {
    const currentIndex = STEP_ORDER.indexOf(current);
    if (current === 'sections') {
      return hasGaps && !skipGapsStep ? 'gaps' : 'persona';
    }
    if (currentIndex < STEP_ORDER.length - 1) {
      return STEP_ORDER[currentIndex + 1];
    }
    return current;
  };

  const getPrevStep = (current: WizardStep): WizardStep => {
    const currentIndex = STEP_ORDER.indexOf(current);
    if (current === 'persona' && !hasGaps) {
      return 'sections';
    }
    if (currentIndex > 0) {
      return STEP_ORDER[currentIndex - 1];
    }
    return current;
  };

  const handleNext = () => {
    if (currentStep === 'review') {
      handleGenerate();
    } else {
      setCurrentStep(getNextStep(currentStep));
    }
  };

  const handleBack = () => {
    setCurrentStep(getPrevStep(currentStep));
  };

  const handleGenerate = async () => {
    if (!brandKitId) return;
    
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-gpt', {
        body: { brandKitId, config }
      });

      if (error) throw error;

      setExportResult(data);
      setCurrentStep('results');
      
      toast({
        title: 'Export generated successfully',
        description: 'Your Custom GPT instructions are ready to use.',
      });
    } catch (error) {
      console.error('Error generating export:', error);
      toast({
        title: 'Error generating export',
        description: 'Failed to generate export. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('sections');
    setConfig(DEFAULT_GPT_EXPORT_CONFIG);
    setExportResult(null);
    setSkipGapsStep(false);
    onOpenChange(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'sections':
        return config.selectedSections.length > 0;
      case 'gaps':
        return true;
      case 'persona':
        return true;
      case 'knowledge':
        return true;
      case 'restrictions':
        return true;
      case 'review':
        return true;
      default:
        return true;
    }
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
          <SectionSelectionStep
            selectedSections={config.selectedSections}
            onSectionsChange={(sections) => setConfig(prev => ({ ...prev, selectedSections: sections }))}
            onCompletenessCalculated={(completeness) => {
              setConfig(prev => ({ ...prev, sectionCompleteness: completeness }));
              const hasAnyGaps = completeness.some(
                c => config.selectedSections.includes(c.sectionId) && c.completenessPercent < 100
              );
              setSkipGapsStep(!hasAnyGaps);
            }}
            visualIdentityMode={config.visualIdentityMode}
            onVisualIdentityModeChange={(mode) => setConfig(prev => ({ ...prev, visualIdentityMode: mode }))}
          />
        );
      case 'gaps':
        return (
          <GapFillingStep
            sectionCompleteness={config.sectionCompleteness}
            selectedSections={config.selectedSections}
            gapFillingMode={config.gapFillingMode}
            onModeChange={(mode) => setConfig(prev => ({ ...prev, gapFillingMode: mode }))}
            onGapsFilled={(filledData) => setConfig(prev => ({ ...prev, filledGaps: filledData }))}
            onComplete={() => setCurrentStep('persona')}
          />
        );
      case 'persona':
        return (
          <PersonaSelectionStep
            selectedPersonaId={config.selectedPersonaId}
            onPersonaChange={(personaId) => setConfig(prev => ({ ...prev, selectedPersonaId: personaId }))}
          />
        );
      case 'knowledge':
        return (
          <KnowledgeFileSelectionStep
            selectedFileIds={config.selectedKnowledgeFileIds}
            onSelectionChange={(ids) => setConfig(prev => ({ ...prev, selectedKnowledgeFileIds: ids }))}
          />
        );
      case 'restrictions':
        return (
          <RestrictionsStep
            restrictions={config.restrictions}
            restrictionsCustom={config.restrictionsCustom || ''}
            onRestrictionsChange={(restrictions) => setConfig(prev => ({ ...prev, restrictions }))}
            onRestrictionsCustomChange={(value) => setConfig(prev => ({ ...prev, restrictionsCustom: value }))}
          />
        );
      case 'review':
        return (
          <ReviewGenerateStep
            config={config}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );
      case 'results':
        return exportResult && (
          <GPTExportResults
            result={exportResult}
            brandKitId={brandKitId || ''}
            config={config}
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

        {currentStep !== 'results' && currentStep !== 'gaps' && (
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
              {currentStep === 'review' ? 'Generate' : 'Next'}
              {currentStep !== 'review' && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
