-- Add INSERT policy for user_subscriptions
CREATE POLICY "Users can create their own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Backfill subscriptions for existing users who don't have one
INSERT INTO public.user_subscriptions (user_id, subscription_tier, tokens_balance, monthly_token_allowance, billing_cycle_start)
SELECT p.id, 'free', 10, 10, now()
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id);

-- Log signup bonus for users who received backfilled subscriptions
INSERT INTO public.token_transactions (user_id, transaction_type, tokens_amount, tokens_balance_after, description)
SELECT us.user_id, 'signup_bonus', 10, 10, 'Welcome bonus - 10 free tokens'
FROM user_subscriptions us
WHERE NOT EXISTS (SELECT 1 FROM token_transactions tt WHERE tt.user_id = us.user_id AND tt.transaction_type = 'signup_bonus');