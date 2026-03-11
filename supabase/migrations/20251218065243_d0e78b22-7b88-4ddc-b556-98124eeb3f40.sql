-- Allow application/octet-stream for .md files that browsers report incorrectly
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf', 
  'application/json', 
  'text/markdown', 
  'text/plain',
  'application/octet-stream'
]
WHERE id = 'user-knowledge-files';