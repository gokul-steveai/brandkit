-- Phase 2: Add Missing Foreign Key Constraints and Indexes

-- ============================================
-- ADD MISSING USER-RELATED FKs
-- ============================================

-- user_subscriptions.user_id → auth.users(id)
ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- token_transactions.user_id → auth.users(id)
ALTER TABLE public.token_transactions
ADD CONSTRAINT token_transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- bonus_redemptions.user_id → auth.users(id)
ALTER TABLE public.bonus_redemptions
ADD CONSTRAINT bonus_redemptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- rate_limits.user_id → auth.users(id)
ALTER TABLE public.rate_limits
ADD CONSTRAINT rate_limits_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- brand_kit_exports.user_id → auth.users(id)
ALTER TABLE public.brand_kit_exports
ADD CONSTRAINT brand_kit_exports_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- ADD PERFORMANCE INDEXES
-- ============================================

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_redemptions_user_id ON public.bonus_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON public.brand_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_exports_user_id ON public.brand_kit_exports(user_id);

-- Library table indexes
CREATE INDEX IF NOT EXISTS idx_library_personality_traits_user_id ON public.library_personality_traits(user_id);
CREATE INDEX IF NOT EXISTS idx_library_brand_values_user_id ON public.library_brand_values(user_id);
CREATE INDEX IF NOT EXISTS idx_library_brand_moods_user_id ON public.library_brand_moods(user_id);
CREATE INDEX IF NOT EXISTS idx_library_brand_principles_user_id ON public.library_brand_principles(user_id);
CREATE INDEX IF NOT EXISTS idx_library_personas_user_id ON public.library_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_library_knowledge_files_user_id ON public.library_knowledge_files(user_id);

-- Brand kit sub-table indexes
CREATE INDEX IF NOT EXISTS idx_brand_kit_core_brand_kit_id ON public.brand_kit_core(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_personality_brand_kit_id ON public.brand_kit_personality(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_expression_brand_kit_id ON public.brand_kit_expression(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_governance_brand_kit_id ON public.brand_kit_governance(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_products_brand_kit_id ON public.brand_kit_products(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_target_audience_brand_kit_id ON public.brand_kit_target_audience(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_personas_brand_kit_id ON public.brand_kit_personas(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_knowledge_files_brand_kit_id ON public.brand_kit_knowledge_files(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_exports_brand_kit_id ON public.brand_kit_exports(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_brand_kit_categories_brand_kit_id ON public.brand_kit_categories(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_brand_kit_id ON public.token_transactions(brand_kit_id);