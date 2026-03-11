-- Create changelog_entries table
CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('new_release', 'improvement', 'retired')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  read_time_minutes INTEGER DEFAULT 2,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on slug for faster lookups
CREATE INDEX idx_changelog_entries_slug ON public.changelog_entries(slug);

-- Create index on published_at for ordering
CREATE INDEX idx_changelog_entries_published_at ON public.changelog_entries(published_at DESC);

-- Create index on entry_type for filtering
CREATE INDEX idx_changelog_entries_entry_type ON public.changelog_entries(entry_type);

-- Create GIN index on tags for array queries
CREATE INDEX idx_changelog_entries_tags ON public.changelog_entries USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view changelog)
CREATE POLICY "Changelog entries are publicly readable"
ON public.changelog_entries
FOR SELECT
USING (true);

-- Admin-only write access
CREATE POLICY "Admins can manage changelog entries"
ON public.changelog_entries
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_changelog_entries_updated_at
BEFORE UPDATE ON public.changelog_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();