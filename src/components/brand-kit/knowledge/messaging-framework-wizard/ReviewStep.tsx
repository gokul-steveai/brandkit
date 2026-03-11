import { ChevronLeft, Coins, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getFrameworksByIds, 
  calculateTokenCost,
  type SelectionMethod 
} from '@/lib/messaging-frameworks';

interface ReviewStepProps {
  selectedFrameworks: string[];
  selectionMethod: SelectionMethod;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function ReviewStep({
  selectedFrameworks,
  selectionMethod,
  onBack,
  onGenerate,
  isGenerating
}: ReviewStepProps) {
  const frameworks = getFrameworksByIds(selectedFrameworks);
  const tokenCost = calculateTokenCost(selectedFrameworks.length, selectionMethod === 'ai_recommended');

  // Group frameworks by emotional load
  const groupedByLoad = {
    low: frameworks.filter(f => f.emotionalLoad === 'low'),
    medium: frameworks.filter(f => f.emotionalLoad === 'medium'),
    high: frameworks.filter(f => f.emotionalLoad === 'high')
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Generate</h3>
        <p className="text-sm text-muted-foreground">
          Confirm your selections and generate your messaging framework specification.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold text-primary">{selectedFrameworks.length}</p>
          <p className="text-xs text-muted-foreground">Frameworks</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
            <Coins className="h-5 w-5" />
            {tokenCost}
          </p>
          <p className="text-xs text-muted-foreground">Token Cost</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
            {selectionMethod === 'ai_recommended' && <Sparkles className="h-5 w-5" />}
            {selectionMethod === 'ai_recommended' ? 'AI' : 'Manual'}
          </p>
          <p className="text-xs text-muted-foreground">Selection</p>
        </div>
      </div>

      {/* Framework breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Selected Frameworks by Intensity</h4>
        
        {/* Low intensity - using primary semantic color */}
        {groupedByLoad.low.length > 0 && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-primary/30 text-primary">
                Low Intensity
              </Badge>
              <span className="text-xs text-muted-foreground">({groupedByLoad.low.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {groupedByLoad.low.map(f => (
                <Badge key={f.id} variant="secondary" className="text-xs">
                  {f.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medium intensity - using accent semantic color */}
        {groupedByLoad.medium.length > 0 && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-accent/30 text-accent-foreground">
                Medium Intensity
              </Badge>
              <span className="text-xs text-muted-foreground">({groupedByLoad.medium.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {groupedByLoad.medium.map(f => (
                <Badge key={f.id} variant="secondary" className="text-xs">
                  {f.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* High intensity - using destructive semantic color */}
        {groupedByLoad.high.length > 0 && (
          <div className="p-3 rounded-lg border bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-destructive/30 text-destructive">
                High Intensity
              </Badge>
              <span className="text-xs text-muted-foreground">({groupedByLoad.high.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {groupedByLoad.high.map(f => (
                <Badge key={f.id} variant="secondary" className="text-xs">
                  {f.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Token cost explanation */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Token Usage Breakdown
        </h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          {selectionMethod === 'ai_recommended' && (
            <div className="flex justify-between">
              <span>AI framework recommendation</span>
              <span>1 token</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Document generation ({selectedFrameworks.length} frameworks)</span>
            <span>{calculateTokenCost(selectedFrameworks.length, false)} tokens</span>
          </div>
          <div className="flex justify-between font-medium text-foreground pt-1 border-t">
            <span>Total</span>
            <span>{tokenCost} tokens</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isGenerating}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Specification
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
