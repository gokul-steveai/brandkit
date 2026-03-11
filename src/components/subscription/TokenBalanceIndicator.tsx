import { useSubscription } from '@/hooks/useSubscription';
import { Progress } from '@/components/ui/progress';
import { Coins, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TokenBalanceIndicatorProps {
  collapsed?: boolean;
}

export function TokenBalanceIndicator({ collapsed = false }: TokenBalanceIndicatorProps) {
  const { subscription, isLoading, planConfig, getBalanceStatus, daysUntilReset } = useSubscription();

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!subscription) return null;

  const balanceStatus = getBalanceStatus();
  const usagePercent = Math.max(0, Math.min(100, ((subscription.monthly_token_allowance - subscription.tokens_balance) / subscription.monthly_token_allowance) * 100));

  const statusColors = {
    success: 'text-chart-2',
    warning: 'text-chart-3',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  };

  const progressColors = {
    success: 'bg-chart-2',
    warning: 'bg-chart-3',
    destructive: 'bg-destructive',
    muted: 'bg-muted',
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              to="/settings?tab=billing&source=token-balance" 
              className="flex items-center justify-center p-2 hover:bg-accent rounded transition-colors"
            >
              <div className="relative">
                <Coins className={cn('h-5 w-5', statusColors[balanceStatus])} />
                {subscription.tokens_balance <= 2 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{subscription.tokens_balance}/{subscription.monthly_token_allowance} tokens</p>
            <p className="text-xs text-muted-foreground">{daysUntilReset} days until reset</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link 
      to="/settings?tab=billing&source=token-balance" 
      className="block px-3 py-2 hover:bg-accent rounded transition-colors group"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Coins className={cn('h-4 w-4', statusColors[balanceStatus])} />
          <span className="text-sm font-medium">
            {subscription.tokens_balance}/{subscription.monthly_token_allowance}
          </span>
        </div>
        <span className="text-xs text-muted-foreground capitalize">
          {planConfig.name}
        </span>
      </div>
      <Progress 
        value={usagePercent} 
        className="h-1.5"
        dualTone
        consumedClassName="bg-destructive"
        remainingClassName="bg-tokens-left"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {daysUntilReset}d until reset
        </span>
        {subscription.tokens_balance <= 5 && (
          <span className="text-xs text-chart-1 flex items-center gap-1 group-hover:underline">
            <Zap className="h-3 w-3" />
            Upgrade
          </span>
        )}
      </div>
    </Link>
  );
}
