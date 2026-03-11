import { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MESSAGING_FRAMEWORKS, 
  type MessagingFramework,
  type SelectionMethod
} from '@/lib/messaging-frameworks';

interface FrameworkSelectionStepProps {
  selectedFrameworks: string[];
  selectionMethod: SelectionMethod;
  onSelectionChange: (frameworks: string[], method: SelectionMethod) => void;
  onNext: () => void;
  onBack: () => void;
  isLoadingAi: boolean;
  onRequestAiSelection: () => void;
}

export function FrameworkSelectionStep({
  selectedFrameworks,
  selectionMethod,
  onSelectionChange,
  onNext,
  onBack,
  isLoadingAi,
  onRequestAiSelection
}: FrameworkSelectionStepProps) {
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filteredFrameworks = filter === 'all' 
    ? MESSAGING_FRAMEWORKS 
    : MESSAGING_FRAMEWORKS.filter(f => f.emotionalLoad === filter);

  const handleToggle = (frameworkId: string) => {
    const newSelection = selectedFrameworks.includes(frameworkId)
      ? selectedFrameworks.filter(id => id !== frameworkId)
      : [...selectedFrameworks, frameworkId];
    onSelectionChange(newSelection, 'manual');
  };

  const handleSelectAll = () => {
    onSelectionChange(MESSAGING_FRAMEWORKS.map(f => f.id), 'manual');
  };

  const handleSelectNone = () => {
    onSelectionChange([], 'manual');
  };

  const getEmotionalLoadColor = (load: string) => {
    switch (load) {
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return '';
    }
  };

  const getEthicalRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Frameworks</h3>
          <p className="text-sm text-muted-foreground">
            Choose which messaging frameworks to include ({selectedFrameworks.length} selected)
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRequestAiSelection}
          disabled={isLoadingAi}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4 text-ai-sparkle" />
          AI Recommend
          <Badge variant="secondary" className="ml-1 text-xs">
            <Coins className="h-3 w-3 mr-1" />
            1 token
          </Badge>
        </Button>
      </div>

      {/* Filter and bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <div className="flex gap-1">
          {(['all', 'low', 'medium', 'high'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-7 text-xs"
            >
              {f === 'all' ? 'All' : `${f.charAt(0).toUpperCase() + f.slice(1)} intensity`}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-7 text-xs">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSelectNone} className="h-7 text-xs">
            Clear
          </Button>
        </div>
      </div>

      {/* Framework list */}
      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-2">
          {filteredFrameworks.map((framework: MessagingFramework) => (
            <div
              key={framework.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedFrameworks.includes(framework.id)
                  ? 'bg-primary/5 border-primary/30'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleToggle(framework.id)}
            >
              <Checkbox
                checked={selectedFrameworks.includes(framework.id)}
                onCheckedChange={() => handleToggle(framework.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{framework.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${getEmotionalLoadColor(framework.emotionalLoad)}`}>
                    {framework.emotionalLoad} intensity
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${getEthicalRiskColor(framework.ethicalRisk)}`}>
                    {framework.ethicalRisk} risk
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {framework.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {framework.contentFormats.slice(0, 3).map(format => (
                    <Badge key={format} variant="secondary" className="text-[10px]">
                      {format.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {framework.contentFormats.length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{framework.contentFormats.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={onNext} disabled={selectedFrameworks.length === 0}>
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
