import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

interface FontInfo {
  family: string;
  role?: string;
}

interface BrandingColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  textPrimary?: string;
  textSecondary?: string;
  link?: string;
}

interface BrandingTypography {
  fontFamilies?: {
    primary?: string;
    heading?: string;
    code?: string;
  };
  fontStacks?: {
    heading?: string[];
    body?: string[];
    paragraph?: string[];
  };
  fontSizes?: {
    h1?: string;
    h2?: string;
    h3?: string;
    body?: string;
  };
  fontWeights?: {
    light?: number;
    regular?: number;
    medium?: number;
    bold?: number;
  };
}

interface BrandingSpacing {
  baseUnit?: number;
  borderRadius?: string;
}

interface ButtonStyle {
  background?: string;
  textColor?: string;
  borderRadius?: string;
  borderColor?: string;
  shadow?: string;
}

interface InputStyle {
  borderColor?: string;
  borderRadius?: string;
}

interface BrandingComponents {
  buttonPrimary?: ButtonStyle;
  buttonSecondary?: ButtonStyle;
  input?: InputStyle;
}

interface BrandingPersonality {
  tone?: string;
  energy?: string;
  targetAudience?: string;
}

interface BrandingImages {
  logo?: string;
  favicon?: string;
  ogImage?: string;
}

interface BrandingData {
  colorScheme?: string;
  logo?: string;
  colors?: BrandingColors;
  fonts?: FontInfo[];
  typography?: BrandingTypography;
  spacing?: BrandingSpacing;
  components?: BrandingComponents;
  personality?: BrandingPersonality;
  images?: BrandingImages;
}

interface ScrapeResult {
  success: boolean;
  rawScrapePath?: string;
  data?: {
    branding?: BrandingData;
    summary?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  branding?: BrandingData;
  summary?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface SocialUrl {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'reddit' | 'twitter' | 'other';
  url: string;
}

export interface ExtractedBrandData {
  name?: string;
  description?: string;
  // Colors
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_primary_color?: string;
  text_secondary_color?: string;
  link_color?: string;
  color_scheme?: string;
  // Typography
  heading_font?: string;
  body_font?: string;
  paragraph_font?: string;
  font_sizes?: Record<string, string>;
  font_weights?: Record<string, number>;
  fonts_list?: FontInfo[];
  // Spacing
  spacing?: BrandingSpacing;
  // Components
  button_styles?: {
    primary?: ButtonStyle;
    secondary?: ButtonStyle;
  };
  input_styles?: InputStyle;
  // Personality
  personality?: BrandingPersonality;
  // Images
  logo_url?: string;
  favicon_url?: string;
  og_image_url?: string;
  // Summary
  summary?: string;
  // Brand voice (derived from personality tone)
  brand_voice?: string;
  // Raw scrape path
  raw_scrape_path?: string;
  // Social media URLs extracted from the website
  social_urls?: SocialUrl[];
}

// Social media URL patterns for detection
const SOCIAL_URL_PATTERNS: { platform: SocialUrl['platform']; pattern: RegExp }[] = [
  { platform: 'facebook', pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\/\s]+/i },
  { platform: 'instagram', pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\/\s]+/i },
  { platform: 'linkedin', pattern: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[^\/\s]+/i },
  { platform: 'tiktok', pattern: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?[^\/\s]+/i },
  { platform: 'youtube', pattern: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel\/|c\/|user\/|@)[^\/\s]+/i },
  { platform: 'reddit', pattern: /(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:r|user)\/[^\/\s]+/i },
  { platform: 'twitter', pattern: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[^\/\s]+/i },
];

function extractSocialUrls(links: string[]): SocialUrl[] {
  const socialUrls: SocialUrl[] = [];
  const seenPlatforms = new Set<string>();

  for (const link of links) {
    for (const { platform, pattern } of SOCIAL_URL_PATTERNS) {
      const match = link.match(pattern);
      if (match && !seenPlatforms.has(platform)) {
        socialUrls.push({ platform, url: match[0].startsWith('http') ? match[0] : `https://${match[0]}` });
        seenPlatforms.add(platform);
        break;
      }
    }
    
    // Check for other social media (like Pinterest, etc.)
    if (!seenPlatforms.has(link)) {
      const otherSocialPatterns = [
        /pinterest\.com/i,
        /tumblr\.com/i,
        /snapchat\.com/i,
        /whatsapp\.com/i,
        /telegram\.org/i,
        /discord\.gg/i,
      ];
      
      for (const otherPattern of otherSocialPatterns) {
        if (otherPattern.test(link)) {
          socialUrls.push({ platform: 'other', url: link.startsWith('http') ? link : `https://${link}` });
          seenPlatforms.add(link);
          break;
        }
      }
    }
  }

  return socialUrls;
}

export const firecrawlApi = {
  async extractBrand(url: string, brandKitId?: string): Promise<FirecrawlResponse<ExtractedBrandData>> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { 
        url, 
        brandKitId,
        options: { 
          formats: ['branding', 'summary', 'links'] 
        } 
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as ScrapeResult & { links?: string[] };
    
    if (!result.success) {
      return { success: false, error: result.data?.toString() || 'Failed to extract brand' };
    }

    // Handle nested data structure - Firecrawl v1 nests content inside data
    const branding = result.data?.branding || result.branding;
    const metadata = result.data?.metadata || result.metadata;
    const summary = result.data?.summary || result.summary;
    const rawScrapePath = result.rawScrapePath;
    const links = (result.data as any)?.links || (result as any).links || [];

    // Extract social media URLs from links
    const socialUrls = extractSocialUrls(links);

    // Transform branding data to our comprehensive schema
    const brandData: ExtractedBrandData = {
      // Basic info from metadata
      name: metadata?.title,
      description: metadata?.description,
      
      // Colors
      primary_color: branding?.colors?.primary,
      secondary_color: branding?.colors?.secondary,
      accent_color: branding?.colors?.accent,
      background_color: branding?.colors?.background,
      text_primary_color: branding?.colors?.textPrimary,
      text_secondary_color: branding?.colors?.textSecondary,
      link_color: branding?.colors?.link,
      color_scheme: branding?.colorScheme,
      
      // Typography
      heading_font: branding?.typography?.fontFamilies?.heading || branding?.fonts?.find(f => f.role === 'heading' || f.role === 'display')?.family,
      body_font: branding?.typography?.fontFamilies?.primary || branding?.fonts?.find(f => f.role === 'body')?.family || branding?.fonts?.[0]?.family,
      paragraph_font: branding?.typography?.fontStacks?.paragraph?.[0] || branding?.fonts?.find(f => f.role === 'paragraph')?.family,
      font_sizes: branding?.typography?.fontSizes,
      font_weights: branding?.typography?.fontWeights,
      fonts_list: branding?.fonts,
      
      // Spacing
      spacing: branding?.spacing,
      
      // Components
      button_styles: branding?.components ? {
        primary: branding.components.buttonPrimary,
        secondary: branding.components.buttonSecondary
      } : undefined,
      input_styles: branding?.components?.input,
      
      // Personality
      personality: branding?.personality,
      
      // Images
      logo_url: branding?.images?.logo || branding?.logo,
      favicon_url: branding?.images?.favicon,
      og_image_url: branding?.images?.ogImage,
      
      // Summary
      summary: summary,
      
      // Brand voice from personality
      brand_voice: branding?.personality?.tone || undefined,
      
      // Raw scrape path
      raw_scrape_path: rawScrapePath,
      
      // Social URLs
      social_urls: socialUrls.length > 0 ? socialUrls : undefined,
    };

    return { success: true, data: brandData };
  }
};
