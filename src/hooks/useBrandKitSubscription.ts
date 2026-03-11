import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_CONFIG, type SubscriptionTier, type FeatureKey, type LimitKey } from '@/lib/subscription/constants';
import { useCallback } from 'react';

export interface BrandKitOwnerSubscription {
  user_id: string;
  subscription_tier: SubscriptionTier;
  tokens_balance: number;
  monthly_token_allowance: number;
}

/**
 * Fetches the brand kit owner's subscription to enable feature inheritance.
 * Collaborators inherit the owner's plan features when working on a brand kit.
 */
export function useBrandKitSubscription(brandKitId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['brandKitOwnerSubscription', brandKitId],
    queryFn: async (): Promise<BrandKitOwnerSubscription | null> => {
      if (!brandKitId) return null;

      // Use secure RPC function to get owner's subscription tier
      // This bypasses RLS on user_subscriptions while verifying access
      const { data, error } = await supabase
        .rpc('get_brand_kit_owner_tier', { p_brand_kit_id: brandKitId });

      if (error) {
        console.error('[useBrandKitSubscription] RPC error:', error);
        return null;
      }

      // If no result (owner has no subscription record), assume free tier
      if (!data || data.length === 0) {
        return {
          user_id: '',
          subscription_tier: 'free' as SubscriptionTier,
          tokens_balance: 0,
          monthly_token_allowance: 10,
        };
      }

      const row = data[0];
      return {
        user_id: row.user_id,
        subscription_tier: row.subscription_tier as SubscriptionTier,
        tokens_balance: row.tokens_balance,
        monthly_token_allowance: row.monthly_token_allowance,
      };
    },
    enabled: !!brandKitId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get plan config based on owner's tier
  const ownerTier = data?.subscription_tier ?? 'free';
  const planConfig = PLAN_CONFIG[ownerTier];

  // Check if a feature is accessible based on owner's plan
  const canAccessFeature = useCallback((feature: FeatureKey): boolean => {
    return planConfig.features[feature] ?? false;
  }, [planConfig]);

  // Get limit for a resource type based on owner's plan
  const getLimit = useCallback((limitKey: LimitKey): number => {
    return planConfig.limits[limitKey] ?? 0;
  }, [planConfig]);

  // Check if more of a resource can be created based on owner's plan
  const canCreateMore = useCallback((limitKey: LimitKey, currentCount: number): boolean => {
    const limit = getLimit(limitKey);
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  }, [getLimit]);

  return {
    ownerSubscription: data,
    ownerTier,
    planConfig,
    isLoading,
    error,
    canAccessFeature,
    getLimit,
    canCreateMore,
  };
}
