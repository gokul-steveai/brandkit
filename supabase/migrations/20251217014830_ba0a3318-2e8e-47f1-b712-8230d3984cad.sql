-- 1. Add manual_override column to user_subscriptions
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

-- 2. Add 'tier_change' to token_transaction_type enum
ALTER TYPE token_transaction_type ADD VALUE IF NOT EXISTS 'tier_change';

-- 3. Create trigger function for automatic tier change handling
CREATE OR REPLACE FUNCTION handle_subscription_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_allowance integer;
  old_tier_name text;
  new_tier_name text;
BEGIN
  -- Only run if subscription_tier actually changed
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    -- Determine token allowance based on new tier
    new_allowance := CASE NEW.subscription_tier
      WHEN 'free' THEN 10
      WHEN 'base' THEN 50
      WHEN 'premium' THEN 150
      ELSE 10
    END;
    
    -- Update related columns
    NEW.monthly_token_allowance := new_allowance;
    NEW.tokens_balance := new_allowance;
    NEW.tokens_used_this_period := 0;
    NEW.billing_cycle_start := now();
    
    -- Set manual_override if no Stripe subscription
    IF NEW.stripe_subscription_id IS NULL THEN
      NEW.manual_override := true;
    END IF;
    
    -- Get tier names for logging
    old_tier_name := CASE OLD.subscription_tier
      WHEN 'free' THEN 'Free'
      WHEN 'base' THEN 'Base'
      WHEN 'premium' THEN 'Premium'
    END;
    new_tier_name := CASE NEW.subscription_tier
      WHEN 'free' THEN 'Free'
      WHEN 'base' THEN 'Base'
      WHEN 'premium' THEN 'Premium'
    END;
    
    -- Log to token_transactions for audit
    INSERT INTO token_transactions (
      user_id,
      transaction_type,
      tokens_amount,
      tokens_balance_after,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      'tier_change',
      new_allowance - OLD.tokens_balance,
      new_allowance,
      format('Plan changed from %s to %s', old_tier_name, new_tier_name),
      jsonb_build_object(
        'old_tier', OLD.subscription_tier::text,
        'new_tier', NEW.subscription_tier::text,
        'manual_override', NEW.manual_override,
        'changed_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS on_subscription_tier_change ON user_subscriptions;
CREATE TRIGGER on_subscription_tier_change
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_tier_change();

-- 5. Create helper function for case-insensitive tier updates
CREATE OR REPLACE FUNCTION update_user_tier(
  _user_id uuid,
  _new_tier text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_tier subscription_tier;
BEGIN
  -- Normalize to lowercase and cast to enum
  normalized_tier := lower(trim(_new_tier))::subscription_tier;
  
  UPDATE user_subscriptions
  SET subscription_tier = normalized_tier
  WHERE user_id = _user_id;
END;
$$;