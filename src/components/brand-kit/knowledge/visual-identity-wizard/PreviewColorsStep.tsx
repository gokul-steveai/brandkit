import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { ExtractedColor } from './types';

interface PreviewColorsStepProps {
  colors: ExtractedColor[];
  onToggleColor: (colorId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function PreviewColorsStep({
  colors,
  onToggleColor,
  onSelectAll,
  onDeselectAll,
  onBack,
  onContinue,
}: PreviewColorsStepProps) {
  const selectedCount = colors.filter(c => c.isSelected).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select which colors to include ({selectedCount} of {colors.length} selected)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
        {colors.map((color) => (
          <button
            key={color.id}
            onClick={() => onToggleColor(color.id)}
            className={`relative flex flex-col items-center p-3 rounded-lg border transition-all ${
              color.isSelected 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            {color.isSelected && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className="w-12 h-12 rounded-full border shadow-sm"
              style={{ backgroundColor: color.hex }}
            />
            <span className="mt-2 text-xs font-medium truncate max-w-full">
              {color.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {color.hex}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {color.source}
            </span>
          </button>
        ))}
      </div>

      {colors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No colors to preview
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={selectedCount === 0}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
