import { Check, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BrandKitDataCompleteness } from '@/lib/messaging-frameworks';

interface DataCheckStepProps {
  dataCompleteness: BrandKitDataCompleteness;
  onNext: () => void;
}

export function DataCheckStep({ dataCompleteness, onNext }: DataCheckStepProps) {
  const requiredItems = [
    { label: 'Target audience persona', passed: dataCompleteness.hasPersona },
    { label: 'Persona pain points', passed: dataCompleteness.hasPainPoints },
    { label: 'Persona goals/motivations', passed: dataCompleteness.hasGoals },
    { label: 'Product/service name', passed: dataCompleteness.hasProduct },
    { label: 'Product description or USP', passed: dataCompleteness.hasProductDescription }
  ];

  const recommendedItems = [
    { label: 'Brand story', passed: dataCompleteness.hasBrandStory },
    { label: 'Tone of voice', passed: dataCompleteness.hasToneOfVoice },
    { label: 'Brand values', passed: dataCompleteness.hasBrandValues }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Required Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          These must be completed before generating your messaging framework specification.
        </p>
        <div className="space-y-2">
          {requiredItems.map((item, i) => (
            <div 
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                item.passed 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-destructive/5 border-destructive/20'
              }`}
            >
              {item.passed ? (
                <div className="p-1 rounded-full bg-primary/10">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              )}
              <span className={`text-sm ${item.passed ? '' : 'text-destructive'}`}>
                {item.label}
              </span>
              {item.passed ? (
                <Badge variant="secondary" className="ml-auto text-xs">Complete</Badge>
              ) : (
                <Badge variant="destructive" className="ml-auto text-xs">Missing</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Recommended Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Optional but will improve the quality of generated examples.
        </p>
        <div className="space-y-2">
          {recommendedItems.map((item, i) => (
            <div 
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                item.passed 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-muted/50 border-muted-foreground/10'
              }`}
            >
              {item.passed ? (
                <div className="p-1 rounded-full bg-primary/10">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-muted">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm">{item.label}</span>
              {item.passed ? (
                <Badge variant="secondary" className="ml-auto text-xs">Complete</Badge>
              ) : (
                <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext} disabled={!dataCompleteness.canGenerate}>
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
