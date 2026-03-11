-- Create expression_examples table for storing user expression examples
-- Using text-based search initially, vector embeddings can be added later for RAG

create table public.expression_examples (
  id uuid primary key default gen_random_uuid(),
  brand_kit_id uuid not null references brand_kits(id) on delete cascade,
  user_id uuid not null,
  
  -- Platform identification
  platform text not null check (platform in ('reddit', 'linkedin', 'instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'email', 'chat', 'other')),
  source text not null default 'manual' check (source in ('manual', 'n8n', 'import')),
  
  -- Context type
  context_type text not null check (context_type in ('comment', 'post', 'reply', 'message', 'caption', 'description', 'thread')),
  
  -- Core content
  original_content text, -- The content being responded to
  user_response text not null, -- The user's actual response
  
  -- Platform-specific metadata (JSONB for flexibility)
  platform_metadata jsonb default '{}',
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient querying
create index idx_expression_examples_brand_kit on expression_examples (brand_kit_id);
create index idx_expression_examples_platform on expression_examples (brand_kit_id, platform);
create index idx_expression_examples_source on expression_examples (brand_kit_id, source);

-- Full-text search index for content
create index idx_expression_examples_content_search on expression_examples 
  using gin(to_tsvector('english', coalesce(original_content, '') || ' ' || user_response));

-- RLS policies
alter table expression_examples enable row level security;

create policy "Users can manage expression examples"
  on expression_examples for all
  using (has_brand_kit_access(brand_kit_id, 'editor'))
  with check (has_brand_kit_access(brand_kit_id, 'editor'));

create policy "Viewers can read expression examples"
  on expression_examples for select
  using (has_brand_kit_access(brand_kit_id, 'viewer'));

-- Updated_at trigger
create trigger update_expression_examples_updated_at
  before update on expression_examples
  for each row execute function update_updated_at_column();