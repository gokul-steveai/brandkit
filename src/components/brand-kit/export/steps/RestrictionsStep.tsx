import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { GPT_RESTRICTION_OPTIONS } from '../types';
import { ShieldAlert } from 'lucide-react';

interface RestrictionsStepProps {
  restrictions: string[];
  restrictionsCustom: string;
  onRestrictionsChange: (restrictions: string[]) => void;
  onRestrictionsCustomChange: (value: string) => void;
}

export function RestrictionsStep({
  restrictions,
  restrictionsCustom,
  onRestrictionsChange,
  onRestrictionsCustomChange,
}: RestrictionsStepProps) {
  const toggleRestriction = (restrictionId: string) => {
    if (restrictions.includes(restrictionId)) {
      onRestrictionsChange(restrictions.filter(r => r !== restrictionId));
    } else {
      onRestrictionsChange([...restrictions, restrictionId]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">What should this GPT avoid?</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Select topics or behaviors the GPT should steer clear of
        </p>

        <div className="grid gap-3">
          {GPT_RESTRICTION_OPTIONS.map((option) => (
            <Card 
              key={option.id}
              className={`p-4 cursor-pointer transition-all ${
                restrictions.includes(option.id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => toggleRestriction(option.id)}
            >
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={restrictions.includes(option.id)}
                  onCheckedChange={() => toggleRestriction(option.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="p-2 bg-muted rounded-lg">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <label className="flex-1 cursor-pointer">{option.label}</label>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Additional restrictions (optional)</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Add any other topics or behaviors the GPT should avoid
        </p>
        <Textarea
          placeholder="e.g., Don't discuss specific legal advice, avoid mentioning internal processes..."
          value={restrictionsCustom}
          onChange={(e) => onRestrictionsCustomChange(e.target.value)}
          rows={4}
        />
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium text-sm mb-2">Preview of restrictions in system instructions:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {restrictions.length === 0 && !restrictionsCustom && (
            <li className="italic">No restrictions selected</li>
          )}
          {restrictions.map(r => {
            const option = GPT_RESTRICTION_OPTIONS.find(o => o.id === r);
            return <li key={r}>• {option?.label}</li>;
          })}
          {restrictionsCustom && <li>• {restrictionsCustom}</li>}
        </ul>
      </div>
    </div>
  );
}
