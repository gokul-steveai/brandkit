-- Update knowledge_files bucket to allow markdown and text files in addition to PDFs
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf', 'text/plain', 'text/markdown', 'text/html']
WHERE id = 'knowledge_files';