import { Building2, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { PersonaType } from './types';

interface PersonaTypeSelectorProps {
  value?: PersonaType;
  onChange: (type: PersonaType) => void;
}

export function PersonaTypeSelector({ value, onChange }: PersonaTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">What type of persona are you creating?</h3>
        <p className="text-sm text-muted-foreground">
          This will customize the fields shown for your persona
        </p>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as PersonaType)}
        className="grid grid-cols-2 gap-4 pt-4"
      >
        <Label
          htmlFor="b2b"
          className={cn(
            "flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50",
            value === 'b2b' && "border-primary bg-primary/5"
          )}
        >
          <RadioGroupItem value="b2b" id="b2b" className="sr-only" />
          <Building2 className="h-10 w-10 mb-3 text-primary" />
          <span className="font-medium text-lg">B2B</span>
          <span className="text-xs text-muted-foreground mt-1">Business customer</span>
        </Label>
        
        <Label
          htmlFor="b2c"
          className={cn(
            "flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50",
            value === 'b2c' && "border-primary bg-primary/5"
          )}
        >
          <RadioGroupItem value="b2c" id="b2c" className="sr-only" />
          <User className="h-10 w-10 mb-3 text-primary" />
          <span className="font-medium text-lg">B2C</span>
          <span className="text-xs text-muted-foreground mt-1">Consumer</span>
        </Label>
      </RadioGroup>
    </div>
  );
}
