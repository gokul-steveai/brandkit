export type PersonaType = 'b2b' | 'b2c';

// Helper to cast persona_type from DB string
export const asPersonaType = (value: string | null | undefined): PersonaType | undefined => {
  if (value === 'b2b' || value === 'b2c') return value;
  return undefined;
};

export interface Demographics {
  age_range?: string;
  gender?: string;
  location?: string;
  income_level?: string;
  education?: string;
}

export interface ProfessionalContext {
  job_title?: string;
  industry?: string;
  company_size?: string;
  company_type?: string;
  experience_level?: string;
  daily_responsibilities?: string;
}

export interface PersonalBackground {
  lifestyle?: string;
  family_status?: string;
  interests?: string;
  background_details?: string;
}

export interface Persona {
  id?: string;
  brand_kit_id: string;
  persona_type?: PersonaType;
  persona_name: string;
  persona_title: string;
  is_primary: boolean;
  demographics: Demographics;
  professional_context: ProfessionalContext;
  personal_background: PersonalBackground;
  goals_motivations: string[];
  frustrations_pain_points: string[];
  values_beliefs: string[];
  fears: string[];
  information_sources: string[];
  influencers: string[];
  tech_usage: string[];
  product_fit: string;
  barriers_to_sale: string[];
  buying_behavior: string;
  current_perception: string;
  // Phase 5: New fields for report-enhanced personas
  content_that_resonates?: string;
  representative_quote?: string;
  platform_behavior?: string;
  source?: 'manual' | 'report' | 'ai_generated';
  // Enhanced persona fields
  core_motivation?: string;
  preferred_channels?: string[];
  expertise_level?: string;
}

export const emptyPersona: Omit<Persona, 'brand_kit_id'> = {
  persona_type: undefined,
  persona_name: '',
  persona_title: '',
  is_primary: false,
  demographics: {},
  professional_context: {},
  personal_background: {},
  goals_motivations: [],
  frustrations_pain_points: [],
  values_beliefs: [],
  fears: [],
  information_sources: [],
  influencers: [],
  tech_usage: [],
  product_fit: '',
  barriers_to_sale: [],
  buying_behavior: '',
  current_perception: '',
  // Phase 5: New fields
  content_that_resonates: '',
  representative_quote: '',
  platform_behavior: '',
  source: 'manual',
  // Enhanced fields
  core_motivation: '',
  preferred_channels: [],
  expertise_level: '',
};

// Core motivation options for selection
export const CORE_MOTIVATION_OPTIONS = [
  'Efficiency',
  'Status',
  'Security',
  'Freedom',
  'Connection',
  'Achievement',
  'Recognition',
  'Growth',
  'Innovation',
  'Stability',
] as const;

// Expertise level options
export const EXPERTISE_LEVEL_OPTIONS = [
  'Novice',
  'Intermediate',
  'Expert',
  'Thought Leader',
] as const;

// Preferred communication channels
export const PREFERRED_CHANNEL_OPTIONS = [
  'Email',
  'LinkedIn',
  'Twitter/X',
  'Instagram',
  'Reddit',
  'Slack',
  'Phone',
  'In-person',
  'YouTube',
  'TikTok',
  'Podcasts',
  'Newsletters',
] as const;

// Dropdown options
export const AGE_RANGE_OPTIONS = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+'
] as const;

export const INCOME_LEVEL_OPTIONS = [
  'Under $25,000',
  '$25,000 - $50,000',
  '$50,000 - $75,000',
  '$75,000 - $100,000',
  '$100,000 - $150,000',
  '$150,000 - $250,000',
  '$250,000+'
] as const;

export const EDUCATION_OPTIONS = [
  'High School',
  'Some College',
  'Associate Degree',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate/PhD',
  'Professional Degree'
] as const;

export const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Marketing/Advertising',
  'Media/Entertainment',
  'Consulting',
  'Legal',
  'Non-profit',
  'Other'
] as const;

export const COMPANY_SIZE_OPTIONS = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees'
] as const;

export const COMPANY_TYPE_OPTIONS = [
  'Startup',
  'SMB',
  'Mid-Market',
  'Enterprise',
  'Agency',
  'Consulting Firm',
  'Other'
] as const;

export interface LibrarySource {
  id: string;
  source_type: 'information_source' | 'influencer' | 'technology';
  name: string;
  url: string | null;
  description: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  skool_url: string | null;
  youtube_url: string | null;
  reddit_url: string | null;
  x_url: string | null;
  facebook_url: string | null;
  rss_feed_url: string | null;
  favicon_url: string | null;
  is_library: boolean;
  user_id: string | null;
  usage_count: number;
  created_at: string;
}
