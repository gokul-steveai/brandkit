import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface VerbalStyle {
  sentence_structure: string;
  vocabulary_level: string;
  punctuation_style: string;
}

interface VerbalStyleCardProps {
  verbalStyle: VerbalStyle;
  onChange: (field: keyof VerbalStyle, value: string) => void;
}

export function VerbalStyleCard({ verbalStyle, onChange }: VerbalStyleCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Verbal Style</CardTitle>
        <CardDescription>Guidelines for written communication</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Sentence Structure</Label>
          <Input
            placeholder="e.g., Short, punchy sentences or longer, flowing prose"
            value={verbalStyle.sentence_structure}
            onChange={(e) => onChange("sentence_structure", e.target.value)}
          />
        </div>
        <div>
          <Label>Vocabulary Level</Label>
          <Input
            placeholder="e.g., Simple and accessible or technical and sophisticated"
            value={verbalStyle.vocabulary_level}
            onChange={(e) => onChange("vocabulary_level", e.target.value)}
          />
        </div>
        <div>
          <Label>Punctuation Style</Label>
          <Input
            placeholder="e.g., Use of exclamation points, em dashes, etc."
            value={verbalStyle.punctuation_style}
            onChange={(e) => onChange("punctuation_style", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
