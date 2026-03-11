import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Lock, Loader2, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_CONFIG, FEATURE_LABELS, STRIPE_PRICE_IDS, type FeatureKey } from '@/lib/subscription/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'tokens' | 'feature' | 'limit';
  feature?: FeatureKey;
  limitType?: string;
}

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  reason = 'tokens',
  feature,
  limitType 
}: UpgradeModalProps) {
  const { planConfig } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const getTitle = () => {
    switch (reason) {
      case 'tokens':
        return 'Out of Tokens';
      case 'feature':
        return `${FEATURE_LABELS[feature!] || 'Feature'} Locked`;
      case 'limit':
        return `${limitType} Limit Reached`;
      default:
        return 'Upgrade Your Plan';
    }
  };

  const getDescription = () => {
    switch (reason) {
      case 'tokens':
        return "You've used all your tokens for this billing period. Upgrade to get more tokens and unlock additional features.";
      case 'feature':
        return `${FEATURE_LABELS[feature!] || 'This feature'} is not available on the ${planConfig.name} plan. Upgrade to access it.`;
      case 'limit':
        return `You've reached the ${limitType?.toLowerCase()} limit for the ${planConfig.name} plan. Upgrade to increase your limits.`;
      default:
        return 'Get access to more features and higher limits.';
    }
  };

  const handleUpgradeToBase = async () => {
    try {
      setIsUpgrading(true);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: STRIPE_PRICE_IDS.base, 
          tier: 'base' 
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      // Open Stripe Checkout in new tab
      window.open(data.url, '_blank');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const basePlanFeatures = [
    '50 tokens per month',
    '3 brand kits',
    '2 AI personas per kit',
    '3 target audiences',
    'Products & Services',
    'Brand Governance',
    'Knowledge Files',
    'Website Scraping',
  ];

  const premiumPlanFeatures = [
    '150 tokens per month',
    'Unlimited brand kits',
    'Unlimited AI personas',
    'Unlimited target audiences',
    'Everything in Base',
    'Content Creation (Coming Soon)',
    'Priority support',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {reason === 'tokens' && <Zap className="h-5 w-5 text-chart-1" />}
            {reason === 'feature' && <Lock className="h-5 w-5 text-muted-foreground" />}
            {reason === 'limit' && <Crown className="h-5 w-5 text-chart-1" />}
            <DialogTitle>{getTitle()}</DialogTitle>
          </div>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Base Plan */}
          <div className="rounded-lg border-2 border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Base Plan</h3>
                <p className="text-2xl font-bold">$19<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </div>
              <Badge variant="outline">Recommended</Badge>
            </div>
            <ul className="space-y-1.5">
              {basePlanFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-chart-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              className="w-full" 
              onClick={handleUpgradeToBase}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to Base
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-lg border-2 border-primary/50 p-4 space-y-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Premium Plan</h3>
                <p className="text-2xl font-bold">$59<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </div>
              <Badge>Coming Soon</Badge>
            </div>
            <ul className="space-y-1.5">
              {premiumPlanFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              <Crown className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to trigger upgrade modal
export function useUpgradePrompt() {
  const [showModal, setShowModal] = useState(false);
  const [modalProps, setModalProps] = useState<Omit<UpgradeModalProps, 'open' | 'onOpenChange'>>({});

  const promptUpgrade = (props: Omit<UpgradeModalProps, 'open' | 'onOpenChange'>) => {
    setModalProps(props);
    setShowModal(true);
  };

  const UpgradePromptModal = () => (
    <UpgradeModal
      open={showModal}
      onOpenChange={setShowModal}
      {...modalProps}
    />
  );

  return { promptUpgrade, UpgradePromptModal, showModal };
}
