-- Create library_target_audience_sources table
CREATE TABLE public.library_target_audience_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL CHECK (source_type IN ('information_source', 'influencer', 'technology')),
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    linkedin_url TEXT,
    skool_url TEXT,
    youtube_url TEXT,
    reddit_url TEXT,
    x_url TEXT,
    facebook_url TEXT,
    rss_feed_url TEXT,
    favicon_url TEXT,
    is_library BOOLEAN NOT NULL DEFAULT true,
    user_id UUID,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_target_audience_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view library and own items" 
ON public.library_target_audience_sources
FOR SELECT USING (is_library = true OR user_id = auth.uid());

CREATE POLICY "Users can create own items" 
ON public.library_target_audience_sources
FOR INSERT WITH CHECK (user_id = auth.uid() AND is_library = false);

CREATE POLICY "Users can update own items" 
ON public.library_target_audience_sources
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own items" 
ON public.library_target_audience_sources
FOR DELETE USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_library_target_audience_sources_type ON public.library_target_audience_sources(source_type);
CREATE INDEX idx_library_target_audience_sources_user_id ON public.library_target_audience_sources(user_id);
CREATE INDEX idx_library_target_audience_sources_name ON public.library_target_audience_sources(name);

-- Add persona_type column to brand_kit_target_audience
ALTER TABLE public.brand_kit_target_audience 
ADD COLUMN IF NOT EXISTS persona_type TEXT DEFAULT 'b2b' CHECK (persona_type IN ('b2b', 'b2c'));

-- Seed library with initial data

-- Information Sources
INSERT INTO public.library_target_audience_sources (source_type, name, url, description, favicon_url, linkedin_url, reddit_url, rss_feed_url, is_library) VALUES
('information_source', 'Reuters', 'https://www.reuters.com', 'Reuters is a leading global news organization providing trusted business, financial, national, and international news.', 'https://www.reuters.com/pf/resources/images/reuters/favicon.ico', NULL, NULL, 'https://www.reuters.com/arc/outboundfeeds/rss/', true),
('information_source', 'LinkedIn', 'https://www.linkedin.com', 'LinkedIn is the world''s largest professional network for career development, networking, and business insights.', 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca', 'https://www.linkedin.com', NULL, NULL, true),
('information_source', 'Reddit', 'https://www.reddit.com', 'Reddit is a social news aggregation and discussion platform where users share content across thousands of topic-based communities.', 'https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png', NULL, 'https://www.reddit.com', 'https://www.reddit.com/.rss', true),
('information_source', 'Quora', 'https://www.quora.com', 'Quora is a question-and-answer platform where people share knowledge on virtually any topic through expert insights and community discussions.', 'https://www.quora.com/favicon.ico', NULL, NULL, NULL, true);

-- Influencers
INSERT INTO public.library_target_audience_sources (source_type, name, url, description, youtube_url, tiktok_url, skool_url, favicon_url, is_library) VALUES
('influencer', 'Duncan Rogoff', 'https://buildroom.ai', 'Founder of Buildroom, helping entrepreneurs and creators build successful online businesses through community-driven learning and actionable strategies.', 'https://www.youtube.com/@duncanrogoff', 'https://www.tiktok.com/@duncanrogoff', 'https://www.skool.com/buildroom', 'https://buildroom.ai/favicon.ico', true);

-- Technology
INSERT INTO public.library_target_audience_sources (source_type, name, url, description, favicon_url, is_library) VALUES
('technology', 'ChatGPT', 'https://chat.openai.com', 'ChatGPT is an AI-powered conversational assistant developed by OpenAI, capable of generating human-like text responses for various tasks including writing, coding, and analysis.', 'https://chat.openai.com/favicon.ico', true),
('technology', 'Notion', 'https://www.notion.so', 'Notion is an all-in-one workspace for notes, documents, wikis, and project management, enabling teams and individuals to organize work and collaborate effectively.', 'https://www.notion.so/images/favicon.ico', true),
('technology', 'Claude', 'https://claude.ai', 'Claude is an AI assistant created by Anthropic, designed to be helpful, harmless, and honest, excelling at analysis, writing, and coding tasks.', 'https://claude.ai/favicon.ico', true),
('technology', 'Lovable', 'https://lovable.dev', 'Lovable is an AI-powered development platform that enables users to build full-stack web applications through natural language conversations.', 'https://lovable.dev/favicon.ico', true),
('technology', 'Figma', 'https://www.figma.com', 'Figma is a collaborative design tool for creating user interfaces, prototypes, and design systems, enabling real-time collaboration between designers and developers.', 'https://static.figma.com/app/icon/1/favicon.ico', true);