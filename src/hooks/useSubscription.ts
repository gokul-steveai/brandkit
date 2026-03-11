import { useState, useCallback } from 'react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_CONFIG, type SubscriptionTier, type FeatureKey, type LimitKey } from '@/lib/subscription/constants';

export interface Subscription {
  id: string;
  user_id: string;
  subscription_tier: SubscriptionTier;
  tokens_balance: number;
  tokens_used_this_period: number;
  monthly_token_allowance: number;
  overage_limit_percent: number;
  billing_cycle_start: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  manual_override?: boolean;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  tokens_amount: number;
  tokens_balance_after: number;
  description: string | null;
  metadata: Record<string, unknown>;
  function_name: string | null;
  brand_kit_id: string | null;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) throw subError;
      
      // If no subscription exists, create one (for existing users)
      if (!subData) {
        const { data: newSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            subscription_tier: 'free',
            tokens_balance: 10,
            monthly_token_allowance: 10,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        setSubscription(newSub as Subscription);
      } else {
        setSubscription(subData as Subscription);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchTransactions = useCallback(async (limit = 50) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTransactions((data || []) as TokenTransaction[]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [user?.id]);

  // Check subscription status from Stripe (only on-demand, not periodically)
  const checkStripeSubscription = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking Stripe subscription:', error);
        return;
      }

      // Only log in development mode to reduce console noise
      if (import.meta.env.DEV) {
        console.log('Stripe subscription check result:', data);
      }
      
      // Refetch subscription to get updated data
      await fetchSubscription();
    } catch (err) {
      console.error('Error checking Stripe subscription:', err);
    }
  }, [user?.id, fetchSubscription]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check Stripe subscription only on initial load (real-time channel handles updates)
  useEffect(() => {
    if (!user?.id) return;

    // Check once on login/page load - no interval needed
    // Real-time subscription channel (below) handles ongoing updates
    checkStripeSubscription();
  }, [user?.id]); // Intentionally exclude checkStripeSubscription to prevent re-runs

  // Real-time subscription to user_subscriptions changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Subscription updated:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Get plan config based on tier
  const planConfig = subscription 
    ? PLAN_CONFIG[subscription.subscription_tier] 
    : PLAN_CONFIG.free;

  // Calculate token usage percentage
  const tokenUsagePercent = subscription
    ? Math.min(100, ((subscription.monthly_token_allowance - subscription.tokens_balance) / subscription.monthly_token_allowance) * 100)
    : 0;

  // Calculate max tokens with overage
  const maxTokensWithOverage = subscription
    ? Math.floor(subscription.monthly_token_allowance * (1 + subscription.overage_limit_percent / 100))
    : 0;

  // Check if user can access a feature
  const canAccessFeature = useCallback((feature: FeatureKey): boolean => {
    if (!subscription) return false;
    return PLAN_CONFIG[subscription.subscription_tier].features[feature] ?? false;
  }, [subscription]);

  // Get limit for a resource type
  const getLimit = useCallback((limitKey: LimitKey): number => {
    if (!subscription) return 0;
    return PLAN_CONFIG[subscription.subscription_tier].limits[limitKey] ?? 0;
  }, [subscription]);

  // Check if user can create more of a resource
  const canCreateMore = useCallback((limitKey: LimitKey, currentCount: number): boolean => {
    const limit = getLimit(limitKey);
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  }, [getLimit]);

  // Check if user has hit token limit (including overage)
  const hasTokensAvailable = subscription 
    ? subscription.tokens_balance > -Math.floor(subscription.monthly_token_allowance * subscription.overage_limit_percent / 100)
    : false;

  // Calculate days until billing cycle reset
  const daysUntilReset = (() => {
    if (!subscription) return 0;
    const startMs = Date.parse(subscription.billing_cycle_start);
    if (Number.isNaN(startMs)) return 0;
    const resetMs = startMs + 30 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((resetMs - Date.now()) / (24 * 60 * 60 * 1000)));
  })();

  // Get token balance status color
  const getBalanceStatus = useCallback(() => {
    if (!subscription) return 'muted';
    const percent = (subscription.tokens_balance / subscription.monthly_token_allowance) * 100;
    if (percent > 50) return 'success';
    if (percent > 20) return 'warning';
    return 'destructive';
  }, [subscription]);

  return {
    subscription,
    transactions,
    isLoading,
    error,
    planConfig,
    tokenUsagePercent,
    maxTokensWithOverage,
    canAccessFeature,
    getLimit,
    canCreateMore,
    hasTokensAvailable,
    daysUntilReset,
    getBalanceStatus,
    refetch: fetchSubscription,
    fetchTransactions,
    checkStripeSubscription,
  };
}
