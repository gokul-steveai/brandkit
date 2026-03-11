import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorInput } from './ColorInput';

interface UIColorsCardProps {
  formData: {
    background_color: string;
    text_primary_color: string;
    text_secondary_color: string;
    link_color: string;
  };
  onColorChange: (field: string, value: string) => void;
}

export function UIColorsCard({ formData, onColorChange }: UIColorsCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">UI Colors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ColorInput
          id="background_color"
          label="Background Color"
          value={formData.background_color}
          onChange={(v) => onColorChange('background_color', v)}
        />
        <ColorInput
          id="text_primary_color"
          label="Text Primary Color"
          value={formData.text_primary_color}
          onChange={(v) => onColorChange('text_primary_color', v)}
        />
        <ColorInput
          id="text_secondary_color"
          label="Text Secondary Color"
          value={formData.text_secondary_color}
          onChange={(v) => onColorChange('text_secondary_color', v)}
        />
        <ColorInput
          id="link_color"
          label="Link Color"
          value={formData.link_color}
          onChange={(v) => onColorChange('link_color', v)}
        />
      </CardContent>
    </Card>
  );
}
