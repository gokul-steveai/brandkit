-- Phase 1: Knowledge File Upload Enhancement
-- Add category and platform_context columns to user_knowledge_file_uploads

-- Add category column for report type classification
ALTER TABLE public.user_knowledge_file_uploads
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Add platform_context column for platform-specific reports
ALTER TABLE public.user_knowledge_file_uploads
ADD COLUMN IF NOT EXISTS platform_context TEXT DEFAULT 'universal';

-- Add extracted_data column for parsed report data (used for comparison)
ALTER TABLE public.user_knowledge_file_uploads
ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Add index for efficient category filtering
CREATE INDEX IF NOT EXISTS idx_user_knowledge_files_category 
ON public.user_knowledge_file_uploads(category);

-- Add index for platform context filtering
CREATE INDEX IF NOT EXISTS idx_user_knowledge_files_platform_context 
ON public.user_knowledge_file_uploads(platform_context);

-- Add comment for documentation
COMMENT ON COLUMN public.user_knowledge_file_uploads.category IS 'Report type: general, writing_style_report, audience_report, performance_report, comment_analysis_report';
COMMENT ON COLUMN public.user_knowledge_file_uploads.platform_context IS 'Platform context: universal, instagram, linkedin, twitter, facebook, youtube, tiktok';
COMMENT ON COLUMN public.user_knowledge_file_uploads.extracted_data IS 'AI-extracted structured data from analysis reports for comparison/import';