-- Add policy for users to insert their own bonuses
CREATE POLICY "Users can insert their own bonuses"
  ON public.bonus_redemptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());