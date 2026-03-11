import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  dualTone?: boolean;
  consumedClassName?: string;
  remainingClassName?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, dualTone, consumedClassName, remainingClassName, ...props }, ref) => {
  if (dualTone) {
    const consumedPercent = value || 0;
    const remainingPercent = 100 - consumedPercent;
    
    return (
      <div
        ref={ref}
        className={cn("relative h-4 w-full overflow-hidden rounded-full flex", className)}
        {...props}
      >
        {/* Consumed portion (left side - red) */}
        <div 
          className={cn("h-full transition-all", consumedClassName || "bg-destructive")}
          style={{ width: `${consumedPercent}%` }}
        />
        {/* Remaining portion (right side - green with opacity) */}
        <div 
          className={cn("h-full transition-all", remainingClassName || "bg-chart-2/30")}
          style={{ width: `${remainingPercent}%` }}
        />
      </div>
    );
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-progress-bar transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
