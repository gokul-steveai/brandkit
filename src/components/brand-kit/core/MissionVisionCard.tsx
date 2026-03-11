import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MissionVisionCardProps {
  mission: string;
  vision: string;
  onMissionChange: (value: string) => void;
  onVisionChange: (value: string) => void;
}

export function MissionVisionCard({
  mission,
  vision,
  onMissionChange,
  onVisionChange,
}: MissionVisionCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Mission & Vision</CardTitle>
        <CardDescription>Define your brand's purpose and aspirations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="mission">Mission Statement</Label>
          <Textarea
            id="mission"
            placeholder="Why does your brand exist? What problem do you solve?"
            value={mission}
            onChange={(e) => onMissionChange(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <div>
          <Label htmlFor="vision">Vision Statement</Label>
          <Textarea
            id="vision"
            placeholder="What does the future look like because of your brand?"
            value={vision}
            onChange={(e) => onVisionChange(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
