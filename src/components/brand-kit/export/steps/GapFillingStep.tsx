import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sparkles, MessageSquare, SkipForward, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { SectionCompleteness, GapFillingMode, GapQuestion, EXPORT_SECTIONS } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

interface GapFillingStepProps {
  sectionCompleteness: SectionCompleteness[];
  selectedSections: string[];
  gapFillingMode: GapFillingMode;
  onModeChange: (mode: GapFillingMode) => void;
  onGapsFilled: (filledData: Record<string, unknown>) => void;
  onComplete: () => void;
}

export function GapFillingStep({
  sectionCompleteness,
  selectedSections,
  gapFillingMode,
  onModeChange,
  onGapsFilled,
  onComplete,
}: GapFillingStepProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiProgress, setAiProgress] = useState(0);

  const sectionsWithGaps = sectionCompleteness
    .filter(c => selectedSections.includes(c.sectionId) && c.completenessPercent < 100)
    .map(c => {
      const section = EXPORT_SECTIONS.find(s => s.id === c.sectionId);
      return { ...c, section };
    });

  const totalMissingFields = sectionsWithGaps.reduce(
    (sum, s) => sum + s.missingFields.length, 
    0
  );

  const handleAIAutoFill = async () => {
    if (!brandKitId) return;
    
    setIsProcessing(true);
    setAiProgress(10);

    try {
      const sectionsToFill = sectionsWithGaps.map(s => s.sectionId);
      
      const { data, error } = await supabase.functions.invoke('fill-brand-gaps', {
        body: { brandKitId, sectionsToFill }
      });

      if (error) throw error;

      setAiProgress(100);
      onGapsFilled(data.filledData || {});
      
      toast({
        title: 'Gaps filled successfully',
        description: `AI enhanced ${sectionsToFill.length} sections with brand-aligned content.`,
      });

      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error) {
      console.error('Error filling gaps:', error);
      toast({
        title: 'Error filling gaps',
        description: 'Failed to auto-fill gaps. Please try again or use manual mode.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGuidedQA = async () => {
    if (!brandKitId) return;
    
    setIsProcessing(true);
    onModeChange('guided_qa');

    try {
      const missingFields = sectionsWithGaps.flatMap(s => 
        s.missingFields.map(f => `${s.sectionId}.${f}`)
      );

      const { data, error } = await supabase.functions.invoke('generate-gap-questions', {
        body: { brandKitId, missingFields }
      });

      if (error) throw error;

      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: 'Error generating questions',
        description: 'Failed to generate questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, submit answers
      submitAnswers();
    }
  };

  const submitAnswers = async () => {
    if (!brandKitId) return;
    
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('fill-brand-gaps', {
        body: { 
          brandKitId, 
          sectionsToFill: sectionsWithGaps.map(s => s.sectionId),
          userAnswers: answers 
        }
      });

      if (error) throw error;

      onGapsFilled(data.filledData || {});
      toast({
        title: 'Answers saved',
        description: 'Your brand kit has been updated with your answers.',
      });
      onComplete();
    } catch (error) {
      console.error('Error saving answers:', error);
      toast({
        title: 'Error saving answers',
        description: 'Failed to save your answers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    onModeChange('skip');
    onComplete();
  };

  // If no gaps, skip this step
  if (sectionsWithGaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium">All sections are complete!</h3>
        <p className="text-muted-foreground mt-2">
          Your selected sections have all the required data.
        </p>
        <Button onClick={onComplete} className="mt-4">
          Continue
        </Button>
      </div>
    );
  }

  // Show guided Q&A interface
  if (gapFillingMode === 'guided_qa' && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-32 h-2" />
        </div>

        <Card className="p-6">
          <Label className="text-base font-medium">{currentQuestion.question}</Label>
          <Textarea
            className="mt-4"
            placeholder={currentQuestion.placeholder || 'Enter your answer...'}
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
            rows={4}
          />
        </Card>

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <Button 
            onClick={handleAnswerSubmit}
            disabled={!answers[currentQuestion.id]?.trim()}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    );
  }

  // Show AI progress
  if (isProcessing && gapFillingMode === 'ai_auto') {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-medium">AI is enhancing your brand kit...</h3>
        <Progress value={aiProgress} className="w-64 h-2 mt-4" />
        <p className="text-sm text-muted-foreground mt-2">
          Analyzing your brand and filling in gaps
        </p>
      </div>
    );
  }

  // Show mode selection
  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-700 dark:text-amber-400">
            Some sections have missing data
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {sectionsWithGaps.length} selected section(s) have {totalMissingFields} missing field(s).
            Choose how to handle this.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card 
          className="p-4 cursor-pointer hover:border-primary transition-colors"
          onClick={handleAIAutoFill}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">AI Auto-Fill</h3>
                <Badge>Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Let AI enhance your brand kit by filling in missing sections based on your existing brand data
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:border-primary transition-colors"
          onClick={handleGuidedQA}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Guided Q&A</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Answer a few questions to fill in the gaps yourself
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onClick={handleSkip}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <SkipForward className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Skip (Continue with gaps)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Export with available data only. Some sections may be incomplete.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
