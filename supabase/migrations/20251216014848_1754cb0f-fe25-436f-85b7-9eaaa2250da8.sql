-- Create library_personas table (presets/templates)
CREATE TABLE public.library_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  purpose_type TEXT NOT NULL, -- content_creation, customer_support, internal_assistant, creative_brainstorming, custom
  role_definition_template TEXT, -- Uses {{brand_name}} placeholders
  function_description_template TEXT,
  personality_description_template TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  behavioral_rules JSONB DEFAULT '[]'::jsonb,
  tone_defaults JSONB DEFAULT '{}'::jsonb,
  is_library BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_kit_personas table
CREATE TABLE public.brand_kit_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose_type TEXT NOT NULL,
  role_definition TEXT,
  function_description TEXT,
  personality_description TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  behavioral_rules JSONB DEFAULT '[]'::jsonb,
  tone_overrides JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create library_knowledge_files table
CREATE TABLE public.library_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_name TEXT NOT NULL, -- e.g., "[brand_history_doc]"
  display_name TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL, -- 'curated_template' | 'auto_generated'
  storage_path TEXT, -- For curated templates
  generation_config JSONB, -- For auto-generated: { sources: ['core', 'personality'], format: 'pdf' }
  system_instruction_hint TEXT, -- "Refer to [brand_history_doc] for detailed brand story"
  is_library BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_kit_knowledge_files table
CREATE TABLE public.brand_kit_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  library_file_id UUID NOT NULL REFERENCES public.library_knowledge_files(id) ON DELETE CASCADE,
  custom_reference_name TEXT,
  is_included_in_export BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.library_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_knowledge_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library_personas
CREATE POLICY "Users can view library and own personas"
ON public.library_personas FOR SELECT
USING (is_library = true OR user_id = auth.uid());

CREATE POLICY "Users can create own personas"
ON public.library_personas FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_library = false);

CREATE POLICY "Users can update own personas"
ON public.library_personas FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own personas"
ON public.library_personas FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for brand_kit_personas
CREATE POLICY "Users can manage their brand kit personas"
ON public.brand_kit_personas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_kits
    WHERE brand_kits.id = brand_kit_personas.brand_kit_id
    AND (brand_kits.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- RLS Policies for library_knowledge_files
CREATE POLICY "Users can view library and own knowledge files"
ON public.library_knowledge_files FOR SELECT
USING (is_library = true OR user_id = auth.uid());

CREATE POLICY "Users can create own knowledge files"
ON public.library_knowledge_files FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_library = false);

CREATE POLICY "Users can update own knowledge files"
ON public.library_knowledge_files FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own knowledge files"
ON public.library_knowledge_files FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for brand_kit_knowledge_files
CREATE POLICY "Users can manage their brand kit knowledge files"
ON public.brand_kit_knowledge_files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brand_kits
    WHERE brand_kits.id = brand_kit_knowledge_files.brand_kit_id
    AND (brand_kits.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create trigger for updated_at on brand_kit_personas
CREATE TRIGGER update_brand_kit_personas_updated_at
BEFORE UPDATE ON public.brand_kit_personas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed library_personas with 4 preset templates
INSERT INTO public.library_personas (name, purpose_type, role_definition_template, function_description_template, personality_description_template, tasks, behavioral_rules, tone_defaults, is_library)
VALUES 
(
  'Marketing Writer',
  'content_creation',
  'You are {{brand_name}}''s creative marketing writer. Your role is to craft compelling content that resonates with the target audience while staying true to the brand voice.',
  'Create engaging marketing content including social media posts, blog articles, email campaigns, ad copy, and website content that drives engagement and conversions.',
  'Creative, strategic, and audience-focused. You balance creativity with brand consistency, always considering the target audience''s needs and preferences.',
  '["Write engaging social media posts", "Create compelling blog articles", "Develop email marketing campaigns", "Write ad copy for various platforms", "Craft website content and landing pages"]'::jsonb,
  '["Always maintain brand voice consistency", "Focus on benefits over features", "Include clear calls-to-action", "Adapt tone for different platforms while staying on-brand"]'::jsonb,
  '{"formality": 50, "energy": 70, "humor": 40}'::jsonb,
  true
),
(
  'Customer Advocate',
  'customer_support',
  'You are {{brand_name}}''s customer service specialist. Your role is to provide empathetic, solution-focused support that reflects the brand''s commitment to customer satisfaction.',
  'Handle customer inquiries, resolve issues, and provide product/service information while maintaining a positive brand experience.',
  'Patient, empathetic, and solution-oriented. You remain calm under pressure and always prioritize customer satisfaction while upholding brand values.',
  '["Respond to customer inquiries", "Resolve complaints and issues", "Provide product/service information", "Escalate complex issues appropriately", "Follow up on customer satisfaction"]'::jsonb,
  '["Always acknowledge customer feelings", "Provide clear, actionable solutions", "Never make promises you cannot keep", "Maintain professionalism in all interactions"]'::jsonb,
  '{"formality": 60, "energy": 50, "humor": 20}'::jsonb,
  true
),
(
  'Brand Consultant',
  'internal_assistant',
  'You are {{brand_name}}''s internal brand consultant. Your role is to help team members understand and apply brand guidelines consistently across all touchpoints.',
  'Advise internal teams on brand guidelines, review content for brand consistency, and provide guidance on brand-appropriate communications.',
  'Knowledgeable, supportive, and detail-oriented. You help colleagues understand not just the rules but the reasoning behind brand decisions.',
  '["Review content for brand consistency", "Answer questions about brand guidelines", "Provide examples of brand-appropriate content", "Help adapt messaging for different contexts", "Train team members on brand standards"]'::jsonb,
  '["Reference specific brand guidelines when advising", "Explain the why behind brand decisions", "Offer constructive alternatives when something is off-brand", "Be supportive rather than critical"]'::jsonb,
  '{"formality": 50, "energy": 50, "humor": 30}'::jsonb,
  true
),
(
  'Creative Partner',
  'creative_brainstorming',
  'You are {{brand_name}}''s creative ideation partner. Your role is to generate innovative ideas and explore new directions while respecting brand boundaries.',
  'Brainstorm creative concepts, explore new campaign ideas, and push creative boundaries while staying within brand guidelines.',
  'Imaginative, bold, and collaborative. You generate diverse ideas and build on concepts, always considering how they align with brand identity.',
  '["Generate creative campaign concepts", "Brainstorm content ideas", "Explore new brand expressions", "Challenge conventional approaches", "Build on and refine ideas collaboratively"]'::jsonb,
  '["Generate multiple options before narrowing down", "Consider brand alignment for all ideas", "Be open to unconventional approaches", "Balance creativity with practicality"]'::jsonb,
  '{"formality": 30, "energy": 80, "humor": 60}'::jsonb,
  true
);

-- Seed library_knowledge_files with auto-generated file types
INSERT INTO public.library_knowledge_files (reference_name, display_name, description, file_type, generation_config, system_instruction_hint, is_library)
VALUES
(
  '[product_catalog]',
  'Product Catalog',
  'Complete catalog of products and services with descriptions, pricing, and key benefits.',
  'auto_generated',
  '{"sources": ["products"], "format": "pdf"}'::jsonb,
  'Refer to [product_catalog] for detailed product information, pricing, and specifications.',
  true
),
(
  '[brand_story]',
  'Brand Story Document',
  'Comprehensive brand story including mission, vision, values, and brand history.',
  'auto_generated',
  '{"sources": ["core", "personality"], "format": "pdf"}'::jsonb,
  'Refer to [brand_story] for the complete brand narrative and foundational elements.',
  true
),
(
  '[audience_profiles]',
  'Target Audience Profiles',
  'Detailed profiles of target audience personas including demographics, motivations, and pain points.',
  'auto_generated',
  '{"sources": ["audience"], "format": "pdf"}'::jsonb,
  'Refer to [audience_profiles] for detailed information about target customer segments.',
  true
),
(
  '[style_guide]',
  'Brand Style Guide',
  'Visual and verbal style guidelines including colors, typography, tone of voice, and expression rules.',
  'auto_generated',
  '{"sources": ["expression", "personality"], "format": "pdf"}'::jsonb,
  'Refer to [style_guide] for detailed brand expression and style guidelines.',
  true
);