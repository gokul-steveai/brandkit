-- Phase 2 Security Fixes

-- 1. Add explicit INSERT denial on user_roles to prevent privilege escalation
-- Users should NOT be able to insert their own roles (only via trigger on signup)
CREATE POLICY "Users cannot insert their own roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- 2. Add ON DELETE CASCADE to child tables that reference brand_kits
-- This prevents orphaned records when a brand kit is deleted

-- Drop existing foreign key constraints and recreate with CASCADE
ALTER TABLE public.brand_kit_core 
DROP CONSTRAINT IF EXISTS brand_kit_core_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_core
ADD CONSTRAINT brand_kit_core_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_personality 
DROP CONSTRAINT IF EXISTS brand_kit_personality_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_personality
ADD CONSTRAINT brand_kit_personality_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_expression 
DROP CONSTRAINT IF EXISTS brand_kit_expression_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_expression
ADD CONSTRAINT brand_kit_expression_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_governance 
DROP CONSTRAINT IF EXISTS brand_kit_governance_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_governance
ADD CONSTRAINT brand_kit_governance_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_personas 
DROP CONSTRAINT IF EXISTS brand_kit_personas_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_personas
ADD CONSTRAINT brand_kit_personas_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_products 
DROP CONSTRAINT IF EXISTS brand_kit_products_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_products
ADD CONSTRAINT brand_kit_products_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_target_audience 
DROP CONSTRAINT IF EXISTS brand_kit_target_audience_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_target_audience
ADD CONSTRAINT brand_kit_target_audience_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_exports 
DROP CONSTRAINT IF EXISTS brand_kit_exports_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_exports
ADD CONSTRAINT brand_kit_exports_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_knowledge_files 
DROP CONSTRAINT IF EXISTS brand_kit_knowledge_files_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_knowledge_files
ADD CONSTRAINT brand_kit_knowledge_files_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;

ALTER TABLE public.brand_kit_categories 
DROP CONSTRAINT IF EXISTS brand_kit_categories_brand_kit_id_fkey;

ALTER TABLE public.brand_kit_categories
ADD CONSTRAINT brand_kit_categories_brand_kit_id_fkey 
FOREIGN KEY (brand_kit_id) REFERENCES public.brand_kits(id) ON DELETE CASCADE;