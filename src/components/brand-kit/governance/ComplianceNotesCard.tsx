import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ComplianceNotesCardProps {
  value: string;
  onChange: (value: string) => void;
}

export function ComplianceNotesCard({ value, onChange }: ComplianceNotesCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Compliance Notes</CardTitle>
        <CardDescription>Industry regulations and legal requirements to follow</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Document any industry-specific regulations, legal requirements, or compliance standards..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px]"
        />
      </CardContent>
    </Card>
  );
}
