import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.ComponentProps<"input"> {
  showStrengthIndicator?: boolean;
  strengthData?: { label: string; color: string; width: string };
}

export function PasswordInput({ 
  className, 
  showStrengthIndicator, 
  strengthData,
  ...props 
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {showStrengthIndicator && strengthData && strengthData.label && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${strengthData.color} transition-all duration-300`}
              style={{ width: strengthData.width }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Password strength: <span className="font-medium">{strengthData.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
