import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FEATURE_LABELS, type FeatureKey } from '@/lib/subscription/constants';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  /** If provided, checks feature access against the brand kit owner's subscription */
  brandKitId?: string;
}

export function FeatureGate({ feature, children, fallback, brandKitId }: FeatureGateProps) {
  // Use brand kit owner's subscription if brandKitId is provided
  const brandKitSub = useBrandKitSubscription(brandKitId);
  const userSub = useSubscription();
  
  // Determine which subscription to use for access checks
  const isLoading = brandKitId ? brandKitSub.isLoading : userSub.isLoading;
  const canAccess = brandKitId 
    ? brandKitSub.canAccessFeature(feature) 
    : userSub.canAccessFeature(feature);
  const planConfig = brandKitId ? brandKitSub.planConfig : userSub.planConfig;

  if (isLoading) return null;

  if (canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-2 border-dashed border-border">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">
          {FEATURE_LABELS[feature] || feature} Locked
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          This feature is not available on the {planConfig.name} plan. 
          Upgrade to access {FEATURE_LABELS[feature]?.toLowerCase() || 'this feature'}.
        </p>
        <Button asChild>
          <Link to="/settings?tab=billing&source=feature-gate&action=upgrade">
            <Zap className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface TokenGateProps {
  children: ReactNode;
  tokensRequired?: number;
}

export function TokenGate({ children, tokensRequired = 1 }: TokenGateProps) {
  const { subscription, hasTokensAvailable, isLoading } = useSubscription();

  if (isLoading) return null;

  if (hasTokensAvailable) {
    return <>{children}</>;
  }

  return (
    <Card className="border-2 border-dashed border-destructive/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Zap className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-lg">Out of Tokens</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          You've used all your tokens for this billing period. 
          {subscription && (
            <span className="block mt-1">
              Current balance: {subscription.tokens_balance} tokens
            </span>
          )}
        </p>
        <Button asChild>
          <Link to="/settings?tab=billing&source=feature-gate&action=tokens">
            <Zap className="mr-2 h-4 w-4" />
            Get More Tokens
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
