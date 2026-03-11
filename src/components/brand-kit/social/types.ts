import type { Tables } from '@/integrations/supabase/types';

export type SocialProfile = Tables<'social_profiles'>;

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'reddit' | 'other';

export type ProfileType = 'personal' | 'company';

export type DataSource = 'manual' | 'apify' | 'n8n';

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  icon: string;
  baseUrlPattern: RegExp;
  placeholder: string;
  color: string;
}

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    baseUrlPattern: /^(https?:\/\/)?(www\.)?linkedin\.com\//i,
    placeholder: 'linkedin.com/in/username',
    color: 'bg-[#0A66C2]',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    baseUrlPattern: /^(https?:\/\/)?(www\.)?facebook\.com\//i,
    placeholder: 'facebook.com/username',
    color: 'bg-[#1877F2]',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    baseUrlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\//i,
    placeholder: 'instagram.com/username',
    color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    baseUrlPattern: /^(https?:\/\/)?(www\.)?tiktok\.com\/@?/i,
    placeholder: 'tiktok.com/@username',
    color: 'bg-[#000000]',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    baseUrlPattern: /^(https?:\/\/)?(www\.)?youtube\.com\/(channel\/|c\/|user\/|@)?/i,
    placeholder: 'youtube.com/@channel',
    color: 'bg-[#FF0000]',
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    icon: 'reddit',
    baseUrlPattern: /^(https?:\/\/)?(www\.)?reddit\.com\/user\//i,
    placeholder: 'reddit.com/user/username',
    color: 'bg-[#FF4500]',
  },
  other: {
    id: 'other',
    name: 'Other',
    icon: 'globe',
    baseUrlPattern: /^(https?:\/\/)/i,
    placeholder: 'Enter social profile URL',
    color: 'bg-muted',
  },
};

export interface Skill {
  title: string;
}

export interface Experience {
  companyId?: string;
  companyUrn?: string;
  companyLink1?: string;
  companyName?: string;
  companySize?: string;
  companyWebsite?: string;
  companyIndustry?: string;
  logo?: string;
  title?: string;
  jobDescription?: string;
  jobStartedOn?: string;
  jobEndedOn?: string | null;
  jobLocation?: string;
  jobStillWorking?: boolean;
  jobLocationCountry?: string;
  employmentType?: string | null;
  subtitle?: string | null;
  caption?: string | null;
  metadata?: string | null;
}

export interface Recommendation {
  name: string;
  subtitle?: string;
  date?: string;
  context?: string;
  description?: string;
  urn?: string;
  url?: string;
}

export interface LinkedInProfileData {
  about?: string;
  connections?: number;
  companyWebsite?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  isInfluencer?: boolean;
  jobTitle?: string;
  headline?: string;
  followers?: number;
  skills?: Skill[];
  verifications?: string[];
  urn?: string;
  experiences?: Experience[];
  highlights?: string[];
  interests?: string[];
  recommendations?: Recommendation[];
  recommendationsReceived?: Recommendation[];
}

// Instagram-specific data from Apify
export interface InstagramProfileData {
  username?: string;
  url?: string;
  fullName?: string;
  biography?: string;
  externalUrls?: Array<{ title: string; url: string; link_type: string }>;
  externalUrl?: string;
  followersCount?: number;
  followsCount?: number;
  hasChannel?: boolean;
  highlightReelCount?: number;
  isBusinessAccount?: boolean;
  joinedRecently?: boolean;
  businessCategoryName?: string;
  private?: boolean;
  verified?: boolean;
  profilePicUrlHD?: string;
  igtvVideoCount?: number;
  postsCount?: number;
  // Legacy n8n fields for backwards compatibility
  followerCount?: string | number;
  profilePicURL?: string;
  postCount?: string | number;
  // Local storage path from edge function
  localProfileImagePath?: string;
}

// Facebook-specific data
export interface FacebookProfileData {
  name?: string;
  username?: string;
  about?: string;
  followerCount?: number;
  friendCount?: number;
  likeCount?: number;
  verified?: boolean;
  profilePicUrl?: string;
  coverPhotoUrl?: string;
  category?: string;
  website?: string;
}

// TikTok-specific data
export interface TikTokProfileData {
  username?: string;
  nickname?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  likesCount?: number;
  videoCount?: number;
  verified?: boolean;
  profilePicUrl?: string;
}

// YouTube-specific data
export interface YouTubeProfileData {
  channelName?: string;
  handle?: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  verified?: boolean;
  profilePicUrl?: string;
  bannerUrl?: string;
  joinedDate?: string;
}

// Reddit-specific data
export interface RedditProfileData {
  username?: string;
  displayName?: string;
  bio?: string;
  karma?: number;
  postKarma?: number;
  commentKarma?: number;
  cakeDay?: string;
  verified?: boolean;
  profilePicUrl?: string;
}

// Union type for all platform data
export type PlatformProfileData = 
  | LinkedInProfileData 
  | InstagramProfileData 
  | FacebookProfileData 
  | TikTokProfileData 
  | YouTubeProfileData 
  | RedditProfileData;

// Check if a URL is a LinkedIn image URL
export function isLinkedInImageUrl(url: string): boolean {
  return url.includes('media.licdn.com/');
}

// Platform base URLs for username normalization
const PLATFORM_BASE_URLS: Record<SocialPlatform, string> = {
  instagram: 'https://instagram.com/',
  linkedin: 'https://linkedin.com/in/',
  facebook: 'https://facebook.com/',
  tiktok: 'https://tiktok.com/@',
  youtube: 'https://youtube.com/@',
  reddit: 'https://reddit.com/user/',
  other: '',
};

// Check if input is a bare username (no domain or protocol)
function isBareUsername(input: string): boolean {
  const trimmed = input.trim();
  // Contains domain indicators
  if (trimmed.includes('.') || trimmed.includes('/') || trimmed.startsWith('http')) {
    return false;
  }
  return true;
}

// Normalize URL to include https:// prefix
export function normalizeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

// Normalize input to a full platform URL (handles bare usernames)
export function normalizeProfileUrl(input: string, platform: SocialPlatform): string {
  if (!input) return input;
  const trimmed = input.trim();
  
  // If it's a bare username, prepend the platform base URL
  if (isBareUsername(trimmed)) {
    const baseUrl = PLATFORM_BASE_URLS[platform];
    // Remove @ prefix if user included it (common for TikTok/Instagram)
    const username = trimmed.replace(/^@/, '');
    return `${baseUrl}${username}`;
  }
  
  // Otherwise, just ensure https:// prefix
  return normalizeUrl(trimmed);
}

// Extract username from a platform URL
export function extractUsernameFromUrl(url: string, platform: SocialPlatform): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/\/$/, '');
    const parts = pathname.split('/').filter(Boolean);
    
    switch (platform) {
      case 'linkedin':
        // linkedin.com/in/username or linkedin.com/company/name
        return parts[1] || null;
      case 'instagram':
      case 'tiktok':
      case 'facebook':
        return parts[0]?.replace('@', '') || null;
      case 'youtube':
        // youtube.com/@channel or youtube.com/c/channel
        const handle = parts[0]?.startsWith('@') ? parts[0].slice(1) : parts[1];
        return handle || null;
      case 'reddit':
        // reddit.com/user/username
        return parts[1] || null;
      default:
        return parts[0] || null;
    }
  } catch {
    return url.replace('@', '');
  }
}

// Validate URL matches platform pattern
export function validatePlatformUrl(url: string, platform: SocialPlatform): boolean {
  const config = PLATFORM_CONFIGS[platform];
  const normalizedUrl = normalizeUrl(url);
  return config.baseUrlPattern.test(normalizedUrl);
}
