export interface TerminologyItem {
  term: string;
  instead_of: string[];
  description: string;
}

export interface LookupResponse {
  definition: string | null;
  source: 'dictionary' | 'urban' | null;
  synonyms: string[];
  status: 'found' | 'not_found' | 'error';
  error?: string;
}

export type LookupStatus = 'idle' | 'loading' | 'complete' | 'error';

// Expression Examples types
export const EXPRESSION_PLATFORMS = [
  'reddit',
  'linkedin',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'twitter',
  'email',
  'chat',
  'other',
] as const;

export type ExpressionPlatform = typeof EXPRESSION_PLATFORMS[number];

// Reduced context types (removed: message, caption, description, thread)
export const CONTEXT_TYPES = [
  'comment',
  'post',
  'reply',
] as const;

export type ContextType = typeof CONTEXT_TYPES[number];

// Platform-specific context types
export const PLATFORM_CONTEXT_TYPES: Record<ExpressionPlatform, ContextType[]> = {
  reddit: ['post', 'comment'],
  linkedin: ['post', 'comment', 'reply'],
  instagram: ['post', 'comment', 'reply'],
  facebook: ['post', 'comment', 'reply'],
  tiktok: ['post', 'comment', 'reply'],
  youtube: ['comment', 'reply'],
  twitter: ['post', 'comment', 'reply'],
  email: ['post', 'reply'],
  chat: ['post', 'reply'],
  other: ['post', 'comment', 'reply'],
};

export const SOURCE_TYPES = ['manual', 'n8n', 'import'] as const;
export type SourceType = typeof SOURCE_TYPES[number];

// Platform-specific metadata interfaces
export interface RedditMetadata {
  subreddit?: string;
  post_title?: string;
  post_author?: string;
  parent_comment?: string;
  post_url?: string;
}

export interface LinkedInMetadata {
  post_author?: string;
  company?: string;
  connection_degree?: number;
  post_type?: string;
  engagement_context?: string;
}

export interface InstagramMetadata {
  post_type?: 'reel' | 'post' | 'story';
  hashtags?: string[];
  post_author?: string;
}

export interface TikTokMetadata {
  video_topic?: string;
  post_author?: string;
  comment_thread_position?: number;
}

export interface YouTubeMetadata {
  video_title?: string;
  channel_name?: string;
  comment_type?: 'comment' | 'reply';
}

export interface FacebookMetadata {
  post_type?: 'group_post' | 'page_post' | 'personal_post';
  group_name?: string;
  post_author?: string;
}

export interface TwitterMetadata {
  tweet_author?: string;
  is_quote_tweet?: boolean;
  thread_position?: number;
}

export interface EmailMetadata {
  subject?: string;
  sender?: string;
  email_type?: 'inquiry' | 'support' | 'sales' | 'other';
}

export interface ChatMetadata {
  platform?: string;
  context?: string;
}

export type PlatformMetadata = 
  | RedditMetadata 
  | LinkedInMetadata 
  | InstagramMetadata 
  | TikTokMetadata 
  | YouTubeMetadata 
  | FacebookMetadata 
  | TwitterMetadata 
  | EmailMetadata 
  | ChatMetadata 
  | Record<string, unknown>;

export interface ExpressionExample {
  id: string;
  brand_kit_id: string;
  user_id: string;
  platform: ExpressionPlatform;
  source: SourceType;
  context_type: ContextType;
  original_content: string | null;
  user_response: string;
  platform_metadata: PlatformMetadata;
  created_at: string;
  updated_at: string;
}

export interface ExpressionExampleFormData {
  platform: ExpressionPlatform;
  context_type: ContextType;
  original_content: string;
  user_response: string;
  platform_metadata: PlatformMetadata;
}

// Platform display info
export const PLATFORM_INFO: Record<ExpressionPlatform, { label: string; color: string }> = {
  reddit: { label: 'Reddit', color: 'bg-orange-500' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-600' },
  instagram: { label: 'Instagram', color: 'bg-pink-500' },
  facebook: { label: 'Facebook', color: 'bg-blue-500' },
  tiktok: { label: 'TikTok', color: 'bg-black' },
  youtube: { label: 'YouTube', color: 'bg-red-600' },
  twitter: { label: 'Twitter/X', color: 'bg-sky-500' },
  email: { label: 'Email', color: 'bg-gray-600' },
  chat: { label: 'Chat', color: 'bg-green-500' },
  other: { label: 'Other', color: 'bg-gray-400' },
};

export const CONTEXT_TYPE_LABELS: Record<ContextType, string> = {
  comment: 'Comment',
  post: 'Post',
  reply: 'Reply',
};
