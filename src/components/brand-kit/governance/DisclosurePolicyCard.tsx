import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DisclosurePolicyCardProps {
  value: string;
  onChange: (value: string) => void;
}

export function DisclosurePolicyCard({ value, onChange }: DisclosurePolicyCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Disclosure Policy</CardTitle>
        <CardDescription>Required disclosures and transparency statements</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Define required disclosures for partnerships, sponsored content, data usage, etc."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px]"
        />
      </CardContent>
    </Card>
  );
}
