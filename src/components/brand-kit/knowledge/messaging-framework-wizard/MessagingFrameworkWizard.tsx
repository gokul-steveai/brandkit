import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { DataCheckStep } from './DataCheckStep';
import { FrameworkSelectionStep } from './FrameworkSelectionStep';
import { ReviewStep } from './ReviewStep';
import { WIZARD_STEPS } from './types';
import { 
  validateBrandKitData,
  type BrandKitDataCompleteness,
  type SelectionMethod,
  type BrandKitWithRelations
} from '@/lib/messaging-frameworks';

interface MessagingFrameworkWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  brandKitName: string;
  onComplete: () => void;
}

export function MessagingFrameworkWizard({
  open,
  onOpenChange,
  brandKitId,
  brandKitName,
  onComplete
}: MessagingFrameworkWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectionMethod, setSelectionMethod] = useState<SelectionMethod>('manual');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataCompleteness, setDataCompleteness] = useState<BrandKitDataCompleteness | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch brand kit data for validation
  useEffect(() => {
    if (open && brandKitId) {
      fetchBrandKitData();
    }
  }, [open, brandKitId]);

  const fetchBrandKitData = async () => {
    setIsLoading(true);
    try {
      // Fetch brand kit with all related data
      const [audienceRes, productsRes, coreRes, expressionRes] = await Promise.all([
        supabase
          .from('brand_kit_target_audience')
          .select('id, persona_name, frustrations_pain_points, goals_motivations, is_primary')
          .eq('brand_kit_id', brandKitId),
        supabase
          .from('brand_kit_products')
          .select('id, name, description, usp')
          .eq('brand_kit_id', brandKitId),
        supabase
          .from('brand_kit_core')
          .select('brand_story, mission, vision')
          .eq('brand_kit_id', brandKitId)
          .maybeSingle(),
        supabase
          .from('brand_kit_expression')
          .select('tone_of_voice, verbal_style')
          .eq('brand_kit_id', brandKitId)
          .maybeSingle()
      ]);

      const brandKitData: BrandKitWithRelations = {
        id: brandKitId,
        name: brandKitName,
        audience: audienceRes.data || [],
        products: productsRes.data || [],
        core: coreRes.data || undefined,
        expression: expressionRes.data || undefined
      };

      const completeness = validateBrandKitData(brandKitData);
      setDataCompleteness(completeness);
    } catch (error) {
      console.error('Error fetching brand kit data:', error);
      toast.error('Failed to load brand kit data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectionChange = (frameworks: string[], method: SelectionMethod) => {
    setSelectedFrameworks(frameworks);
    setSelectionMethod(method);
  };

  const handleRequestAiSelection = async () => {
    setIsLoadingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-messaging-framework-spec', {
        body: {
          action: 'recommend',
          brandKitId
        }
      });

      if (error) throw error;

      if (data?.recommendedFrameworks) {
        setSelectedFrameworks(data.recommendedFrameworks);
        setSelectionMethod('ai_recommended');
        toast.success('AI selected the top 10 frameworks for your brand');
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      toast.error('Failed to get AI recommendations');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-messaging-framework-spec', {
        body: {
          action: 'generate',
          brandKitId,
          selectedFrameworks,
          selectionMethod
        }
      });

      if (error) throw error;

      toast.success('Messaging Framework Specification generated successfully!');
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating spec:', error);
      toast.error('Failed to generate specification');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setSelectedFrameworks([]);
    setSelectionMethod('manual');
    onOpenChange(false);
  };

  if (isLoading || !dataCompleteness) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Messaging Framework Specification</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-4">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep === 0 && (
          <DataCheckStep 
            dataCompleteness={dataCompleteness}
            onNext={handleNext}
          />
        )}

        {currentStep === 1 && (
          <FrameworkSelectionStep
            selectedFrameworks={selectedFrameworks}
            selectionMethod={selectionMethod}
            onSelectionChange={handleSelectionChange}
            onNext={handleNext}
            onBack={handleBack}
            isLoadingAi={isLoadingAi}
            onRequestAiSelection={handleRequestAiSelection}
          />
        )}

        {currentStep === 2 && (
          <ReviewStep
            selectedFrameworks={selectedFrameworks}
            selectionMethod={selectionMethod}
            onBack={handleBack}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
