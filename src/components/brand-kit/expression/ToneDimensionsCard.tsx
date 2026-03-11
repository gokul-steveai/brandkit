import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Gauge } from "lucide-react";

export interface ToneDimensions {
  formality: number;
  energy: number;
  warmth: number;
  confidence: number;
  complexity: number;
}

interface DimensionConfig {
  key: keyof ToneDimensions;
  label: string;
  minLabel: string;
  maxLabel: string;
  description: string;
}

const DIMENSION_CONFIG: DimensionConfig[] = [
  {
    key: 'energy',
    label: 'Energy',
    minLabel: 'Calm & Measured',
    maxLabel: 'Dynamic & Energetic',
    description: 'The vitality and pace of communication',
  },
  {
    key: 'formality',
    label: 'Formality',
    minLabel: 'Casual & Relaxed',
    maxLabel: 'Professional & Formal',
    description: 'Level of professionalism in language',
  },
  {
    key: 'warmth',
    label: 'Warmth',
    minLabel: 'Neutral & Objective',
    maxLabel: 'Warm & Personal',
    description: 'Emotional connection and friendliness',
  },
  {
    key: 'confidence',
    label: 'Confidence',
    minLabel: 'Humble & Tentative',
    maxLabel: 'Bold & Assertive',
    description: 'Assertiveness and authority in voice',
  },
  {
    key: 'complexity',
    label: 'Complexity',
    minLabel: 'Simple & Direct',
    maxLabel: 'Nuanced & Detailed',
    description: 'Depth and sophistication of content',
  },
];

interface ToneDimensionsCardProps {
  dimensions: ToneDimensions;
  onChange: (dimensions: ToneDimensions) => void;
}

export function ToneDimensionsCard({ dimensions, onChange }: ToneDimensionsCardProps) {
  const handleDimensionChange = (key: keyof ToneDimensions, value: number) => {
    onChange({
      ...dimensions,
      [key]: value,
    });
  };

  const getValueLabel = (value: number): string => {
    if (value <= 20) return 'Very Low';
    if (value <= 40) return 'Low';
    if (value <= 60) return 'Moderate';
    if (value <= 80) return 'High';
    return 'Very High';
  };

  const getValueColor = (value: number): string => {
    if (value <= 30) return 'text-blue-500';
    if (value <= 70) return 'text-muted-foreground';
    return 'text-orange-500';
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Voice Dimensions</CardTitle>
        </div>
        <CardDescription>
          Fine-tune the balance of your brand voice across key dimensions. These scales help AI understand your voice preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {DIMENSION_CONFIG.map((config) => {
          const value = dimensions[config.key];
          return (
            <div key={config.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">{config.label}</Label>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
                <span className={`text-sm font-medium ${getValueColor(value)}`}>
                  {value}%
                </span>
              </div>
              <div className="space-y-1">
                <Slider
                  value={[value]}
                  onValueChange={([newValue]) => handleDimensionChange(config.key, newValue)}
                  max={100}
                  min={0}
                  step={5}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{config.minLabel}</span>
                  <span className="text-center">{getValueLabel(value)}</span>
                  <span>{config.maxLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
