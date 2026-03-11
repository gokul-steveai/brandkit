import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

interface ToneAttribute {
  attribute: string;
  min_label: string;
  max_label: string;
  value: number;
}

interface ToneOfVoice {
  description: string;
  attributes: ToneAttribute[];
}

interface BrandToneCardProps {
  toneOfVoice: ToneOfVoice;
  onDescriptionChange: (description: string) => void;
  onAttributeChange: (index: number, value: number) => void;
}

export function BrandToneCard({ toneOfVoice, onDescriptionChange, onAttributeChange }: BrandToneCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Brand Tone</CardTitle>
        <CardDescription>Define how your brand sounds in communications. Adapts to context</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Description</Label>
          <Textarea
            placeholder="Describe your brand's overall tone..."
            value={toneOfVoice.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
        <div className="space-y-6">
          {toneOfVoice.attributes.map((attr, index) => (
            <div key={attr.attribute} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{attr.min_label}</span>
                <span className="font-medium">{attr.attribute}</span>
                <span>{attr.max_label}</span>
              </div>
              <Slider
                value={[attr.value]}
                onValueChange={([value]) => onAttributeChange(index, value)}
                max={100}
                step={1}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
