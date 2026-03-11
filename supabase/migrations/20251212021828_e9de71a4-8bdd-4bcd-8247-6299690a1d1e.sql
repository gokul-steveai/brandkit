
-- Create library tables for reusable brand elements

-- Library: Personality Traits
CREATE TABLE public.library_personality_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    description TEXT,
    is_library BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library: Brand Principles
CREATE TABLE public.library_brand_principles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    action TEXT,
    tag TEXT,
    use_case TEXT,
    is_library BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library: Brand Values
CREATE TABLE public.library_brand_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_library BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library: Brand Moods
CREATE TABLE public.library_brand_moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    emotional_description TEXT,
    visual_descriptor TEXT,
    associated_tone TEXT,
    is_library BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Industries hierarchy
CREATE TABLE public.industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.subindustries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry_id UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subindustry_id UUID NOT NULL REFERENCES public.subindustries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brand Kit Core section
CREATE TABLE public.brand_kit_core (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE UNIQUE,
    mission TEXT,
    vision TEXT,
    brand_story TEXT,
    brand_promises JSONB DEFAULT '[]',
    industry_id UUID REFERENCES public.industries(id),
    subindustry_id UUID REFERENCES public.subindustries(id),
    sector_id UUID REFERENCES public.sectors(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brand Kit Personality section
CREATE TABLE public.brand_kit_personality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE UNIQUE,
    trait_ids UUID[] DEFAULT '{}',
    principle_ids UUID[] DEFAULT '{}',
    value_ids UUID[] DEFAULT '{}',
    mood_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brand Kit Expression section
CREATE TABLE public.brand_kit_expression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE UNIQUE,
    tone_of_voice JSONB DEFAULT '{}',
    verbal_style JSONB DEFAULT '{}',
    preferred_terminology JSONB DEFAULT '[]',
    visual_style JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brand Kit Products
CREATE TABLE public.brand_kit_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    cost DECIMAL(10,2),
    special_pricing TEXT,
    usp TEXT,
    key_benefits JSONB DEFAULT '[]',
    competitive_differentiation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brand Kit Target Audience
CREATE TABLE public.brand_kit_target_audience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
    persona_name TEXT,
    persona_title TEXT,
    is_primary BOOLEAN DEFAULT false,
    demographics JSONB DEFAULT '{}',
    professional_context JSONB DEFAULT '{}',
    personal_background JSONB DEFAULT '{}',
    goals_motivations JSONB DEFAULT '[]',
    frustrations_pain_points JSONB DEFAULT '[]',
    values_beliefs JSONB DEFAULT '[]',
    fears JSONB DEFAULT '[]',
    information_sources JSONB DEFAULT '[]',
    influencers JSONB DEFAULT '[]',
    buying_behavior TEXT,
    tech_usage JSONB DEFAULT '[]',
    product_fit TEXT,
    current_perception TEXT,
    barriers_to_sale JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brand Kit Governance
CREATE TABLE public.brand_kit_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE UNIQUE,
    behavioral_constraints JSONB DEFAULT '[]',
    usage_guidelines JSONB DEFAULT '[]',
    approval_workflows JSONB DEFAULT '[]',
    compliance_notes TEXT,
    disclosure_policy TEXT,
    negative_directory JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.library_personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_brand_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_brand_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_brand_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subindustries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_expression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_target_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_governance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library tables (users see library items + their own)
CREATE POLICY "Users can view library and own items" ON public.library_personality_traits
    FOR SELECT USING (is_library = true OR user_id = auth.uid());
CREATE POLICY "Users can create own items" ON public.library_personality_traits
    FOR INSERT WITH CHECK (user_id = auth.uid() AND is_library = false);
CREATE POLICY "Users can update own items" ON public.library_personality_traits
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own items" ON public.library_personality_traits
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view library and own items" ON public.library_brand_principles
    FOR SELECT USING (is_library = true OR user_id = auth.uid());
CREATE POLICY "Users can create own items" ON public.library_brand_principles
    FOR INSERT WITH CHECK (user_id = auth.uid() AND is_library = false);
CREATE POLICY "Users can update own items" ON public.library_brand_principles
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own items" ON public.library_brand_principles
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view library and own items" ON public.library_brand_values
    FOR SELECT USING (is_library = true OR user_id = auth.uid());
CREATE POLICY "Users can create own items" ON public.library_brand_values
    FOR INSERT WITH CHECK (user_id = auth.uid() AND is_library = false);
CREATE POLICY "Users can update own items" ON public.library_brand_values
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own items" ON public.library_brand_values
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view library and own items" ON public.library_brand_moods
    FOR SELECT USING (is_library = true OR user_id = auth.uid());
CREATE POLICY "Users can create own items" ON public.library_brand_moods
    FOR INSERT WITH CHECK (user_id = auth.uid() AND is_library = false);
CREATE POLICY "Users can update own items" ON public.library_brand_moods
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own items" ON public.library_brand_moods
    FOR DELETE USING (user_id = auth.uid());

-- RLS for industry hierarchy (public read)
CREATE POLICY "Anyone can view industries" ON public.industries FOR SELECT USING (true);
CREATE POLICY "Anyone can view subindustries" ON public.subindustries FOR SELECT USING (true);
CREATE POLICY "Anyone can view sectors" ON public.sectors FOR SELECT USING (true);

-- RLS for brand kit extension tables
CREATE POLICY "Users can manage their brand kit core" ON public.brand_kit_core
    FOR ALL USING (EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can manage their brand kit personality" ON public.brand_kit_personality
    FOR ALL USING (EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can manage their brand kit expression" ON public.brand_kit_expression
    FOR ALL USING (EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can manage their brand kit products" ON public.brand_kit_products
    FOR ALL USING (EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can manage their brand kit target audience" ON public.brand_kit_target_audience
    FOR ALL USING (EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can manage their brand kit governance" ON public.brand_kit_governance
    FOR ALL USING (EXISTS (SELECT 1 FROM brand_kits WHERE id = brand_kit_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

-- Triggers for updated_at
CREATE TRIGGER update_brand_kit_core_updated_at BEFORE UPDATE ON public.brand_kit_core
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_kit_personality_updated_at BEFORE UPDATE ON public.brand_kit_personality
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_kit_expression_updated_at BEFORE UPDATE ON public.brand_kit_expression
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_kit_products_updated_at BEFORE UPDATE ON public.brand_kit_products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_kit_target_audience_updated_at BEFORE UPDATE ON public.brand_kit_target_audience
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_kit_governance_updated_at BEFORE UPDATE ON public.brand_kit_governance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
