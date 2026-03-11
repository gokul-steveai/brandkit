import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Calendar, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function UsageCard() {
  const { subscription, isLoading, planConfig, getBalanceStatus, daysUntilReset, tokenUsagePercent } = useSubscription();

  if (isLoading) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const balanceStatus = getBalanceStatus();
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

  return (
    <Card className="border-2 border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
        <Coins className={cn('h-4 w-4', statusColors[balanceStatus])} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold">{subscription.tokens_balance}</div>
          <span className="text-sm text-muted-foreground">
            of {subscription.monthly_token_allowance} tokens
          </span>
        </div>
        
        <Progress 
          value={tokenUsagePercent} 
          className="h-2"
          dualTone
          consumedClassName="bg-destructive"
          remainingClassName="bg-chart-2/30"
        />
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{subscription.tokens_used_this_period} used</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{daysUntilReset}d until reset</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground capitalize">
            {planConfig.name} Plan
          </span>
          {subscription.subscription_tier === 'free' && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings?tab=billing&source=usage-card" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Upgrade
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
