-- Create user_knowledge_file_uploads table
CREATE TABLE public.user_knowledge_file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  doc_id text,
  original_file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'json', 'markdown')),
  storage_path text NOT NULL,
  version text DEFAULT '1.0',
  source text,
  department text,
  tags jsonb DEFAULT '[]'::jsonb,
  sensitivity text DEFAULT 'Internal' CHECK (sensitivity IN ('Internal', 'Public', 'Confidential')),
  attribution text,
  audience text,
  related_projects jsonb DEFAULT '[]'::jsonb,
  description text,
  is_ai_generated_metadata boolean DEFAULT false,
  file_size_bytes integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_user_knowledge_files_brand_kit ON public.user_knowledge_file_uploads(brand_kit_id);
CREATE INDEX idx_user_knowledge_files_user ON public.user_knowledge_file_uploads(user_id);

-- Enable RLS
ALTER TABLE public.user_knowledge_file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view files they uploaded or files in brand kits they have access to
CREATE POLICY "Users can view their own knowledge files"
ON public.user_knowledge_file_uploads
FOR SELECT
USING (user_id = auth.uid() OR has_brand_kit_access(brand_kit_id, 'viewer'));

-- Users can insert files for brand kits they have editor access to
CREATE POLICY "Users can upload knowledge files"
ON public.user_knowledge_file_uploads
FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_brand_kit_access(brand_kit_id, 'editor'));

-- Users can update their own files
CREATE POLICY "Users can update their own knowledge files"
ON public.user_knowledge_file_uploads
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own files
CREATE POLICY "Users can delete their own knowledge files"
ON public.user_knowledge_file_uploads
FOR DELETE
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_user_knowledge_files_updated_at
BEFORE UPDATE ON public.user_knowledge_file_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update user-knowledge-files bucket to allow PDF, JSON, and markdown MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf', 'application/json', 'text/markdown', 'text/plain']
WHERE id = 'user-knowledge-files';