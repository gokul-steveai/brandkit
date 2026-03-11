-- Create documentation_pages table
CREATE TABLE public.documentation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  parent_slug TEXT,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_markdown TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  badge TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentation_pages ENABLE ROW LEVEL SECURITY;

-- Public read access (documentation is public)
CREATE POLICY "Anyone can view published docs" 
  ON public.documentation_pages 
  FOR SELECT 
  USING (is_published = true);

-- Admins can manage documentation
CREATE POLICY "Admins can manage documentation" 
  ON public.documentation_pages 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_documentation_pages_updated_at
  BEFORE UPDATE ON public.documentation_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();