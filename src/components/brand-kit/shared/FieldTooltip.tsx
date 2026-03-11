import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}

export function FieldTooltip({ 
  label, 
  tooltip, 
  required = false, 
  className,
  htmlFor,
}: FieldTooltipProps) {
  return (
    <Label htmlFor={htmlFor} className={cn("flex items-center gap-1.5", className)}>
      {label}
      {required && <span className="text-destructive">*</span>}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Label>
  );
}
