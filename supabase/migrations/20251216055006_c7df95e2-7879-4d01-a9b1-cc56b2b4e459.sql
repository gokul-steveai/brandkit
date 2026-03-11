-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'base', 'premium');

-- Create token transaction type enum
CREATE TYPE public.token_transaction_type AS ENUM (
  'signup_bonus',
  'onboarding_bonus',
  'referral_bonus',
  'api_usage',
  'plan_refresh',
  'promotion',
  'manual_adjustment'
);

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  tokens_balance INTEGER NOT NULL DEFAULT 10,
  tokens_used_this_period INTEGER NOT NULL DEFAULT 0,
  monthly_token_allowance INTEGER NOT NULL DEFAULT 10,
  overage_limit_percent INTEGER NOT NULL DEFAULT 10,
  billing_cycle_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create token_transactions table for detailed logging
CREATE TABLE public.token_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type public.token_transaction_type NOT NULL,
  tokens_amount INTEGER NOT NULL,
  tokens_balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  function_name TEXT,
  brand_kit_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to subscriptions"
  ON public.user_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS policies for token_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.token_transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to transactions"
  ON public.token_transactions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX idx_token_transactions_created_at ON public.token_transactions(created_at DESC);
CREATE INDEX idx_token_transactions_type ON public.token_transactions(transaction_type);

-- Trigger to update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, subscription_tier, tokens_balance, monthly_token_allowance, billing_cycle_start)
  VALUES (NEW.id, 'free', 10, 10, now());
  
  -- Log the signup bonus
  INSERT INTO public.token_transactions (user_id, transaction_type, tokens_amount, tokens_balance_after, description)
  VALUES (NEW.id, 'signup_bonus', 10, 10, 'Welcome bonus - 10 free tokens');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create subscription when profile is created
CREATE TRIGGER on_profile_created_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();