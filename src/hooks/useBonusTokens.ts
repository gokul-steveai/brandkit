import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';

// Bonus configurations
export const BONUS_CONFIG = {
  complete_profile: {
    tokens: 2,
    description: 'Complete your profile',
    displayName: 'Profile Completed'
  },
  first_brand_kit: {
    tokens: 2,
    description: 'Create your first brand kit',
    displayName: 'First Brand Kit'
  },
  brand_kit_50_percent: {
    tokens: 3,
    description: 'Fill 50% of a brand kit',
    displayName: 'Brand Kit Progress'
  },
  first_export: {
    tokens: 3,
    description: 'Export your first persona',
    displayName: 'First Export'
  },
} as const;

export type BonusType = keyof typeof BONUS_CONFIG;

interface BonusRedemption {
  id: string;
  bonus_type: string;
  tokens_awarded: number;
  created_at: string;
}

export function useBonusTokens() {
  const { user } = useAuth();
  const [redeemedBonuses, setRedeemedBonuses] = useState<BonusRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's redeemed bonuses
  const fetchRedeemedBonuses = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('bonus_redemptions' as any)
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setRedeemedBonuses(data as unknown as BonusRedemption[]);
    }
  }, [user?.id]);

  // Check if a bonus has already been redeemed
  const isBonusRedeemed = useCallback((bonusType: BonusType): boolean => {
    return redeemedBonuses.some(b => b.bonus_type === bonusType);
  }, [redeemedBonuses]);

  // Award a bonus to the user
  const awardBonus = useCallback(async (bonusType: BonusType, metadata?: Record<string, unknown>): Promise<boolean> => {
    if (!user?.id) return false;
    
    const bonus = BONUS_CONFIG[bonusType];
    if (!bonus) return false;

    // Check if already redeemed
    if (isBonusRedeemed(bonusType)) {
      return false;
    }

    setIsLoading(true);
    try {
      // Insert bonus redemption record (cast to any to handle dynamic table)
      const { error: redemptionError } = await supabase
        .from('bonus_redemptions' as any)
        .insert({
          user_id: user.id,
          bonus_type: bonusType,
          tokens_awarded: bonus.tokens,
          metadata: metadata || {},
        });

      if (redemptionError) {
        // If it's a unique constraint error, bonus was already redeemed
        if (redemptionError.code === '23505') {
          return false;
        }
        throw redemptionError;
      }

      // Update user's token balance
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('tokens_balance')
        .eq('user_id', user.id)
        .single();

      if (subError) throw subError;

      const newBalance = (subscription?.tokens_balance || 0) + bonus.tokens;

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ tokens_balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log the transaction
      await supabase.from('token_transactions').insert({
        user_id: user.id,
        transaction_type: 'onboarding_bonus',
        tokens_amount: bonus.tokens,
        tokens_balance_after: newBalance,
        description: `Bonus: ${bonus.displayName}`,
        metadata: { bonus_type: bonusType, ...metadata },
      });

      // Update local state
      setRedeemedBonuses(prev => [...prev, {
        id: crypto.randomUUID(),
        bonus_type: bonusType,
        tokens_awarded: bonus.tokens,
        created_at: new Date().toISOString(),
      }]);

      toast({
        title: `🎉 Bonus Earned: +${bonus.tokens} tokens!`,
        description: bonus.displayName,
      });

      return true;
    } catch (error) {
      console.error('Error awarding bonus:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isBonusRedeemed]);

  // Check and award bonus for profile completion
  const checkProfileCompletion = useCallback(async () => {
    if (!user?.id || isBonusRedeemed('complete_profile')) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profile?.full_name && profile.full_name.trim() !== '') {
      await awardBonus('complete_profile');
    }
  }, [user?.id, isBonusRedeemed, awardBonus]);

  // Check and award bonus for first brand kit
  const checkFirstBrandKit = useCallback(async () => {
    if (!user?.id || isBonusRedeemed('first_brand_kit')) return;

    const { count } = await supabase
      .from('brand_kits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count && count >= 1) {
      await awardBonus('first_brand_kit');
    }
  }, [user?.id, isBonusRedeemed, awardBonus]);

  // Check and award bonus for brand kit 50% completion
  const checkBrandKit50Percent = useCallback(async (brandKitId: string) => {
    if (!user?.id || isBonusRedeemed('brand_kit_50_percent')) return;

    const { data: brandKit } = await supabase
      .from('brand_kits')
      .select('completion_percentage')
      .eq('id', brandKitId)
      .eq('user_id', user.id)
      .single();

    if (brandKit && brandKit.completion_percentage >= 50) {
      await awardBonus('brand_kit_50_percent', { brand_kit_id: brandKitId });
    }
  }, [user?.id, isBonusRedeemed, awardBonus]);

  // Check and award bonus for first export
  const checkFirstExport = useCallback(async () => {
    if (!user?.id || isBonusRedeemed('first_export')) return;
    await awardBonus('first_export');
  }, [user?.id, isBonusRedeemed, awardBonus]);

  // Get available (unclaimed) bonuses
  const getAvailableBonuses = useCallback(() => {
    return Object.entries(BONUS_CONFIG)
      .filter(([type]) => !isBonusRedeemed(type as BonusType))
      .map(([type, config]) => ({
        type: type as BonusType,
        ...config,
      }));
  }, [isBonusRedeemed]);

  return {
    redeemedBonuses,
    isLoading,
    fetchRedeemedBonuses,
    isBonusRedeemed,
    awardBonus,
    checkProfileCompletion,
    checkFirstBrandKit,
    checkBrandKit50Percent,
    checkFirstExport,
    getAvailableBonuses,
    BONUS_CONFIG,
  };
}
