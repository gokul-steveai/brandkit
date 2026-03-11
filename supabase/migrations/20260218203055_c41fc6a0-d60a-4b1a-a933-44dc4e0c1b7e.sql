
-- Fix all SECURITY DEFINER functions to use immutable empty search_path
-- and fully qualify all references to prevent search path injection attacks

-- 1. has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
            AND role = _role
    )
$$;

-- 2. get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT role FROM public.user_roles 
    WHERE user_id = _user_id 
    ORDER BY 
        CASE role 
            WHEN 'admin' THEN 1 
            WHEN 'author' THEN 2 
            WHEN 'viewer' THEN 3 
        END
    LIMIT 1
$$;

-- 3. is_brand_kit_member
CREATE OR REPLACE FUNCTION public.is_brand_kit_member(_brand_kit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_kit_members 
    WHERE brand_kit_id = _brand_kit_id 
    AND user_id = auth.uid()
  )
$$;

-- 4. has_brand_kit_access
CREATE OR REPLACE FUNCTION public.has_brand_kit_access(_brand_kit_id uuid, _required_role text DEFAULT 'viewer'::text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM public.brand_kits 
      WHERE id = _brand_kit_id AND user_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR
    EXISTS (
      SELECT 1 FROM public.brand_kit_members 
      WHERE brand_kit_id = _brand_kit_id 
      AND user_id = auth.uid()
      AND (
        CASE _required_role
          WHEN 'viewer' THEN role IN ('viewer', 'editor', 'admin')
          WHEN 'editor' THEN role IN ('editor', 'admin')
          WHEN 'admin' THEN role = 'admin'
          ELSE false
        END
      )
    )
$$;

-- 5. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'author'::public.app_role);
    
    RETURN NEW;
END;
$$;

-- 6. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 7. handle_new_user_subscription
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, subscription_tier, tokens_balance, monthly_token_allowance, billing_cycle_start)
  VALUES (NEW.id, 'free'::public.subscription_tier, 10, 10, now());
  
  INSERT INTO public.token_transactions (user_id, transaction_type, tokens_amount, tokens_balance_after, description)
  VALUES (NEW.id, 'signup_bonus'::public.token_transaction_type, 10, 10, 'Welcome bonus - 10 free tokens');
  
  RETURN NEW;
END;
$$;

-- 8. handle_subscription_tier_change
CREATE OR REPLACE FUNCTION public.handle_subscription_tier_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_allowance integer;
  old_tier_name text;
  new_tier_name text;
BEGIN
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    new_allowance := CASE NEW.subscription_tier
      WHEN 'free' THEN 10
      WHEN 'base' THEN 50
      WHEN 'premium' THEN 150
      ELSE 10
    END;
    
    NEW.monthly_token_allowance := new_allowance;
    NEW.tokens_balance := new_allowance;
    NEW.tokens_used_this_period := 0;
    NEW.billing_cycle_start := now();
    
    IF NEW.stripe_subscription_id IS NULL THEN
      NEW.manual_override := true;
    END IF;
    
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
    
    INSERT INTO public.token_transactions (
      user_id, transaction_type, tokens_amount, tokens_balance_after, description, metadata
    ) VALUES (
      NEW.user_id,
      'tier_change'::public.token_transaction_type,
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

-- 9. increment_brand_kit_version
CREATE OR REPLACE FUNCTION public.increment_brand_kit_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

-- 10. get_brand_kit_owner_tier
CREATE OR REPLACE FUNCTION public.get_brand_kit_owner_tier(p_brand_kit_id uuid)
RETURNS TABLE(user_id uuid, subscription_tier text, tokens_balance integer, monthly_token_allowance integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.has_brand_kit_access(p_brand_kit_id, 'viewer') THEN
    RAISE EXCEPTION 'Access denied: you do not have access to this brand kit';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    us.subscription_tier::text,
    us.tokens_balance,
    us.monthly_token_allowance
  FROM public.brand_kits bk
  JOIN public.user_subscriptions us ON us.user_id = bk.user_id
  WHERE bk.id = p_brand_kit_id;
END;
$$;

-- 11. update_user_tier
CREATE OR REPLACE FUNCTION public.update_user_tier(_user_id uuid, _new_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_tier public.subscription_tier;
BEGIN
  normalized_tier := lower(trim(_new_tier))::public.subscription_tier;
  
  UPDATE public.user_subscriptions
  SET subscription_tier = normalized_tier
  WHERE user_id = _user_id;
END;
$$;

-- 12. get_next_messaging_framework_version
CREATE OR REPLACE FUNCTION public.get_next_messaging_framework_version(p_brand_kit_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.messaging_framework_specs
  WHERE brand_kit_id = p_brand_kit_id;
$$;
