import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSubscription, TokenTransaction } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Zap, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink, Loader2, Settings, Receipt } from "lucide-react";
import { format } from "date-fns";
import { PLAN_CONFIG, STRIPE_PRICE_IDS, type SubscriptionTier } from "@/lib/subscription/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TokenPurchaseCard } from "./TokenPurchaseCard";

const TRANSACTION_TYPE_LABELS: Record<string, { label: string; icon: typeof ArrowUpRight }> = {
  signup_bonus: { label: "Welcome Bonus", icon: ArrowUpRight },
  onboarding_bonus: { label: "Onboarding Bonus", icon: ArrowUpRight },
  referral_bonus: { label: "Referral Bonus", icon: ArrowUpRight },
  api_usage: { label: "API Usage", icon: ArrowDownRight },
  plan_refresh: { label: "Monthly Refresh", icon: RefreshCw },
  promotion: { label: "Promotion", icon: ArrowUpRight },
  manual_adjustment: { label: "Adjustment", icon: TrendingUp },
  tier_change: { label: "Plan Upgrade", icon: ArrowUpRight },
  token_purchase: { label: "Token Purchase", icon: ArrowUpRight },
};

// Tier order for comparison
const TIER_ORDER: SubscriptionTier[] = ['free', 'base', 'premium'];

export function BillingSettings() {
  const {
    subscription,
    transactions,
    isLoading,
    planConfig,
    daysUntilReset,
    getBalanceStatus,
    fetchTransactions,
    maxTokensWithOverage,
    checkStripeSubscription,
  } = useSubscription();

  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [upgradingTo, setUpgradingTo] = useState<SubscriptionTier | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle portal return - detect when user comes back from Stripe portal
  useEffect(() => {
    const portalAction = searchParams.get('portal_action');
    if (portalAction === 'complete') {
      // Remove the query param
      searchParams.delete('portal_action');
      setSearchParams(searchParams, { replace: true });
      
      // Refresh subscription and show success message
      checkStripeSubscription().then(() => {
        toast.success('Subscription updated successfully');
      });
    }
  }, [searchParams, setSearchParams, checkStripeSubscription]);

  useEffect(() => {
    fetchTransactions(showAllTransactions ? 100 : 20);
  }, [fetchTransactions, showAllTransactions]);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'free') return; // Can't upgrade to free via Stripe
    
    try {
      setUpgradingTo(tier);
      
      const priceId = STRIPE_PRICE_IDS[tier];
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, tier },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      // Open Stripe Checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setUpgradingTo(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setOpeningPortal(true);
      
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      
      // Handle case where user has no Stripe customer record
      if (data?.error === 'no_customer') {
        toast.error('No billing history found. Please subscribe to a plan first.');
        return;
      }
      
      if (!data?.url) throw new Error('No portal URL received');

      // Open Stripe Customer Portal in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleRefreshSubscription = async () => {
    try {
      await checkStripeSubscription();
      toast.success('Subscription status refreshed');
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to load subscription data.</p>
        </CardContent>
      </Card>
    );
  }

  const balanceStatus = getBalanceStatus();
  const usagePercent = Math.max(
    0,
    ((subscription.monthly_token_allowance - subscription.tokens_balance) / subscription.monthly_token_allowance) * 100,
  );

  const plans: { tier: SubscriptionTier; current: boolean }[] = [
    { tier: "free", current: subscription.subscription_tier === "free" },
    { tier: "base", current: subscription.subscription_tier === "base" },
    { tier: "premium", current: subscription.subscription_tier === "premium" },
  ];

  const hasActiveSubscription = subscription.subscription_tier !== 'free';
  const isManuallyManaged = subscription.manual_override === true;
  const currentTierIndex = TIER_ORDER.indexOf(subscription.subscription_tier);

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Token Balance
              </CardTitle>
              <CardDescription>Your current usage and remaining tokens</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleRefreshSubscription}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Badge variant={subscription.subscription_tier === "free" ? "secondary" : "default"}>
                {planConfig.name} Plan
                {isManuallyManaged && " (Manual)"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Balance Display */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{subscription.tokens_balance}</p>
              <p className="text-sm text-muted-foreground">
                of {subscription.monthly_token_allowance} tokens remaining
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{daysUntilReset} days until reset</span>
              </div>
              {(() => {
                const billingStartMs = Date.parse(subscription.billing_cycle_start);
                if (Number.isNaN(billingStartMs)) return null;
                const resetMs = billingStartMs + 30 * 24 * 60 * 60 * 1000;
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    Resets on {format(new Date(resetMs), "MMM d, yyyy")}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={usagePercent}
              className="h-3"
              dualTone
              consumedClassName="bg-destructive/50"
              remainingClassName="bg-tokens-left"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{subscription.tokens_used_this_period} used</span>
              <span>10% overage allowed (up to {maxTokensWithOverage} total)</span>
            </div>
          </div>

          {/* Low Balance Warning */}
          {subscription.tokens_balance <= 5 && (
            <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
              <Zap className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium">Running low on tokens</p>
                <p className="text-xs text-muted-foreground">Upgrade your plan or buy tokens to continue</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => handleUpgrade('base')}>
                Upgrade
              </Button>
            </div>
          )}

          {/* Manage Subscription Button - Only show for non-manual Stripe subscribers */}
          {hasActiveSubscription && !isManuallyManaged && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleManageSubscription}
              disabled={openingPortal}
            >
              {openingPortal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Subscription
                </>
              )}
            </Button>
          )}

          {/* Manual override notice */}
          {isManuallyManaged && (
            <p className="text-sm text-muted-foreground text-center">
              Your subscription is managed externally.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that fits your needs. 
            {hasActiveSubscription && !isManuallyManaged && " Use 'Switch Plan' to upgrade or downgrade via the billing portal."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map(({ tier, current }) => {
              const config = PLAN_CONFIG[tier];
              const targetTierIndex = TIER_ORDER.indexOf(tier);
              const isUpgrade = targetTierIndex > currentTierIndex;
              const isDowngrade = targetTierIndex < currentTierIndex;
              const isUpgrading = upgradingTo === tier;

              // Determine button state for downgrades based on manual_override
              const getDowngradeButtonContent = () => {
                if (isManuallyManaged) {
                  return "Contact Support";
                }
                if (tier === 'free') {
                  return "Cancel Subscription";
                }
                return "Switch Plan";
              };

              const handleDowngradeClick = () => {
                if (isManuallyManaged) {
                  // Open support dialog or show instructions
                  toast.info("Please contact support to modify your plan.", {
                    description: "Email: support@brandkitos.com",
                    duration: 5000,
                  });
                } else {
                  // Open Stripe portal for paying customers
                  handleManageSubscription();
                }
              };

              return (
                <div
                  key={tier}
                  className={cn(
                    "relative p-4 border-2 rounded-lg",
                    current ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  {current && (
                    <Badge className="absolute -top-2 left-4" variant="default">
                      Current
                    </Badge>
                  )}

                  <h3 className="font-semibold text-lg mt-1">{config.name}</h3>
                  <p className="text-2xl font-bold mt-2">
                    ${config.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>

                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-chart-2" />
                      {config.monthlyTokens} tokens/month
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-4 w-4 text-center">📦</span>
                      {config.limits.brandKits === -1 ? "Unlimited" : config.limits.brandKits} brand kit
                      {config.limits.brandKits !== 1 ? "s" : ""}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-4 w-4 text-center">👤</span>
                      {config.limits.personas === -1 ? "Unlimited" : config.limits.personas} persona
                      {config.limits.personas !== 1 ? "s" : ""}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-4 w-4 text-center">🎯</span>
                      {config.limits.targetAudiences === -1 ? "Unlimited" : config.limits.targetAudiences} target
                      audience{config.limits.targetAudiences !== 1 ? "s" : ""}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-4 w-4 text-center">🌐</span>
                      {config.limits.websiteScrapes === -1 ? "Unlimited" : config.limits.websiteScrapes} website scrape
                      {config.limits.websiteScrapes !== 1 ? "s" : ""}
                    </li>
                  </ul>

                  {isDowngrade ? (
                    <Button
                      className="w-full mt-4"
                      variant="secondary"
                      onClick={handleDowngradeClick}
                      disabled={openingPortal}
                    >
                      {openingPortal ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        getDowngradeButtonContent()
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full mt-4"
                      variant={current ? "outline" : "default"}
                      disabled={current || isUpgrading}
                      onClick={() => handleUpgrade(tier)}
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : current ? (
                        "Current Plan"
                      ) : (
                        <>
                          Upgrade
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Extra Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Add Extra Tokens
          </CardTitle>
          <CardDescription>
            Your {planConfig.name} plan includes {planConfig.monthlyTokens} tokens/month. 
            Need more? Token packs are one-time purchases that add to your balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenPurchaseCard embedded />
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>
                Token transactions and usage. 
                {hasActiveSubscription && !isManuallyManaged && (
                  <Button 
                    variant="link" 
                    className="h-auto p-0 ml-1" 
                    onClick={handleManageSubscription}
                    disabled={openingPortal}
                  >
                    View all invoices in billing portal
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAllTransactions(!showAllTransactions)}>
              {showAllTransactions ? "Show Less" : "Show All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeConfig = TRANSACTION_TYPE_LABELS[tx.transaction_type] || {
                    label: tx.transaction_type,
                    icon: TrendingUp,
                  };
                  const isCredit = tx.tokens_amount > 0;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <typeConfig.icon className={cn("h-4 w-4", isCredit ? "text-chart-2" : "text-destructive")} />
                          <span>{typeConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || tx.function_name || "-"}
                      </TableCell>
                      <TableCell
                        className={cn("text-right font-medium", isCredit ? "text-chart-2" : "text-destructive")}
                      >
                        {isCredit ? "+" : ""}
                        {tx.tokens_amount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{tx.tokens_balance_after}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
