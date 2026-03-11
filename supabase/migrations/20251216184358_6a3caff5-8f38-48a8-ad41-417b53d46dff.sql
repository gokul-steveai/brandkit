-- Update RLS policies on brand kit sub-tables to include member access

-- ============================================
-- BRAND_KIT_CORE
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit core" ON public.brand_kit_core;
CREATE POLICY "Users can view brand kit core"
ON public.brand_kit_core FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit core"
ON public.brand_kit_core FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_PERSONALITY
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit personality" ON public.brand_kit_personality;
CREATE POLICY "Users can view brand kit personality"
ON public.brand_kit_personality FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit personality"
ON public.brand_kit_personality FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_EXPRESSION
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit expression" ON public.brand_kit_expression;
CREATE POLICY "Users can view brand kit expression"
ON public.brand_kit_expression FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit expression"
ON public.brand_kit_expression FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_GOVERNANCE
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit governance" ON public.brand_kit_governance;
CREATE POLICY "Users can view brand kit governance"
ON public.brand_kit_governance FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit governance"
ON public.brand_kit_governance FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_PRODUCTS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit products" ON public.brand_kit_products;
CREATE POLICY "Users can view brand kit products"
ON public.brand_kit_products FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit products"
ON public.brand_kit_products FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_TARGET_AUDIENCE
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit target audience" ON public.brand_kit_target_audience;
CREATE POLICY "Users can view brand kit target audience"
ON public.brand_kit_target_audience FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit target audience"
ON public.brand_kit_target_audience FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_PERSONAS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit personas" ON public.brand_kit_personas;
CREATE POLICY "Users can view brand kit personas"
ON public.brand_kit_personas FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit personas"
ON public.brand_kit_personas FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_KNOWLEDGE_FILES
-- ============================================
DROP POLICY IF EXISTS "Users can manage their brand kit knowledge files" ON public.brand_kit_knowledge_files;
CREATE POLICY "Users can view brand kit knowledge files"
ON public.brand_kit_knowledge_files FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit knowledge files"
ON public.brand_kit_knowledge_files FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));

-- ============================================
-- BRAND_KIT_CATEGORIES
-- ============================================
DROP POLICY IF EXISTS "Authors can manage their brand kit categories" ON public.brand_kit_categories;
DROP POLICY IF EXISTS "Users can add categories to their own brand kits" ON public.brand_kit_categories;
DROP POLICY IF EXISTS "Users can remove categories from their own brand kits" ON public.brand_kit_categories;
DROP POLICY IF EXISTS "Users can view their own brand kit categories" ON public.brand_kit_categories;

CREATE POLICY "Users can view brand kit categories"
ON public.brand_kit_categories FOR SELECT
USING (has_brand_kit_access(brand_kit_id, 'viewer'));

CREATE POLICY "Users can modify brand kit categories"
ON public.brand_kit_categories FOR ALL
USING (has_brand_kit_access(brand_kit_id, 'editor'))
WITH CHECK (has_brand_kit_access(brand_kit_id, 'editor'));