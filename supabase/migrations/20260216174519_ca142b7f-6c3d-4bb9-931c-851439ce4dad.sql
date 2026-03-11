
-- Create a secure function that allows collaborators to look up the brand kit owner's subscription tier
-- without granting them direct access to the user_subscriptions table
CREATE OR REPLACE FUNCTION public.get_brand_kit_owner_tier(p_brand_kit_id uuid)
RETURNS TABLE (
  user_id uuid,
  subscription_tier text,
  tokens_balance integer,
  monthly_token_allowance integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller has at least viewer access to this brand kit
  IF NOT has_brand_kit_access(p_brand_kit_id, 'viewer') THEN
    RAISE EXCEPTION 'Access denied: you do not have access to this brand kit';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    us.subscription_tier::text,
    us.tokens_balance,
    us.monthly_token_allowance
  FROM brand_kits bk
  JOIN user_subscriptions us ON us.user_id = bk.user_id
  WHERE bk.id = p_brand_kit_id;
END;
$$;
