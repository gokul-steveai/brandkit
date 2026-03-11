import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface VisualStyle {
  aesthetic: string;
  imagery_guidelines: string;
  color_usage: string;
}

interface VisualStyleCardProps {
  visualStyle: VisualStyle;
  onChange: (field: keyof VisualStyle, value: string) => void;
}

export function VisualStyleCard({ visualStyle, onChange }: VisualStyleCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Visual Style</CardTitle>
        <CardDescription>Guidelines for visual brand elements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Aesthetic</Label>
          <Textarea
            placeholder="Describe your overall visual aesthetic..."
            value={visualStyle.aesthetic}
            onChange={(e) => onChange("aesthetic", e.target.value)}
          />
        </div>
        <div>
          <Label>Imagery Guidelines</Label>
          <Textarea
            placeholder="Guidelines for photography, illustrations, and graphics..."
            value={visualStyle.imagery_guidelines}
            onChange={(e) => onChange("imagery_guidelines", e.target.value)}
          />
        </div>
        <div>
          <Label>Color Usage</Label>
          <Textarea
            placeholder="Rules for using brand colors..."
            value={visualStyle.color_usage}
            onChange={(e) => onChange("color_usage", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
