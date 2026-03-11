import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface IndustryClassification {
  id: string;
  name: string;
  level: 'industry' | 'subindustry' | 'sector';
  parent_id: string | null;
}

interface IndustryClassificationCardProps {
  industries: IndustryClassification[];
  subindustries: IndustryClassification[];
  sectors: IndustryClassification[];
  selectedIndustry: string | null;
  selectedSubindustry: string | null;
  selectedSector: string | null;
  onIndustryChange: (value: string) => void;
  onSubindustryChange: (value: string) => void;
  onSectorChange: (value: string) => void;
}

export function IndustryClassificationCard({
  industries,
  subindustries,
  sectors,
  selectedIndustry,
  selectedSubindustry,
  selectedSector,
  onIndustryChange,
  onSubindustryChange,
  onSectorChange,
}: IndustryClassificationCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Industry Classification</CardTitle>
        <CardDescription>Categorize your brand within the market</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Industry</Label>
            <Select
              value={selectedIndustry || ''}
              onValueChange={onIndustryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subindustry</Label>
            <Select
              value={selectedSubindustry || ''}
              onValueChange={onSubindustryChange}
              disabled={!selectedIndustry}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subindustry" />
              </SelectTrigger>
              <SelectContent>
                {subindustries.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sector</Label>
            <Select
              value={selectedSector || ''}
              onValueChange={onSectorChange}
              disabled={!selectedSubindustry}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
