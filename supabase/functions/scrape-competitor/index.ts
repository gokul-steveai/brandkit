import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOCIAL_PATTERNS: { platform: string; pattern: RegExp }[] = [
  { platform: 'facebook', pattern: /(?:facebook\.com|fb\.com)\/[^\s"')]+/i },
  { platform: 'instagram', pattern: /instagram\.com\/[^\s"')]+/i },
  { platform: 'twitter', pattern: /(?:twitter\.com|x\.com)\/[^\s"')]+/i },
  { platform: 'linkedin', pattern: /linkedin\.com\/(?:company|in)\/[^\s"')]+/i },
  { platform: 'youtube', pattern: /(?:youtube\.com|youtu\.be)\/[^\s"')]+/i },
  { platform: 'tiktok', pattern: /tiktok\.com\/@[^\s"')]+/i },
  { platform: 'reddit', pattern: /reddit\.com\/r\/[^\s"')]+/i },
];

function extractSocialProfiles(links: string[], markdown: string): { platform: string; url: string }[] {
  const profiles: { platform: string; url: string }[] = [];
  const seen = new Set<string>();

  // Check links array first
  for (const link of links) {
    for (const { platform, pattern } of SOCIAL_PATTERNS) {
      if (pattern.test(link) && !seen.has(platform)) {
        seen.add(platform);
        profiles.push({ platform, url: link });
        break;
      }
    }
  }

  // Fallback: scan markdown for social URLs
  if (profiles.length === 0 && markdown) {
    const urlRegex = /https?:\/\/[^\s"')>\]]+/gi;
    const mdUrls = markdown.match(urlRegex) || [];
    for (const url of mdUrls) {
      for (const { platform, pattern } of SOCIAL_PATTERNS) {
        if (pattern.test(url) && !seen.has(platform)) {
          seen.add(platform);
          profiles.push({ platform, url });
          break;
        }
      }
    }
  }

  return profiles;
}

function cleanBrandName(rawName: string | null): string | null {
  if (!rawName) return null;
  // Strip common page title patterns: "Name | Site", "Name - Site", "Name — Site"
  const parts = rawName.split(/\s*[|–—]\s*/);
  // Use the shortest meaningful part (likely the brand name)
  const cleaned = parts
    .map(p => p.trim())
    .filter(p => p.length > 1 && p.length < 60)
    .sort((a, b) => a.length - b.length)[0];
  return cleaned || parts[0]?.trim() || rawName;
}

function deduplicateColors(colors: string[]): string[] {
  const seen = new Set<string>();
  return colors.filter(c => {
    const lower = c.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function extractValueProps(markdown: string): string[] {
  const props: string[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('- ') || trimmed.startsWith('* ')) &&
      trimmed.length > 15 &&
      trimmed.length < 200 &&
      !trimmed.includes('![') && // Skip image markdown
      !trimmed.includes('http') && // Skip raw URLs
      !/^\W+$/.test(trimmed.replace(/^[-*]\s+/, '')) // Skip non-text
    ) {
      const text = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');
      if (!props.includes(text)) {
        props.push(text);
      }
      if (props.length >= 5) break;
    }
  }
  return props;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const { url, brandKitId } = await req.json();
    if (!url || !brandKitId) {
      return new Response(JSON.stringify({ success: false, error: 'URL and brandKitId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Scraping competitor:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['branding', 'markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    const scrapeResult = await response.json();
    if (!response.ok) {
      console.error('Firecrawl error:', scrapeResult);
      return new Response(JSON.stringify({ success: false, error: scrapeResult.error || 'Scrape failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = scrapeResult.data || scrapeResult;
    const branding = data.branding || {};
    const links = data.links || [];
    const markdown = data.markdown || '';
    const metadata = data.metadata || {};

    // Extract and clean data
    const rawName = metadata.title || branding.name || null;
    const name = cleanBrandName(rawName);
    const description = metadata.description || null;
    const logoUrl = branding.images?.logo || branding.logo || null;
    const tagline = branding.personality?.tagline || null;

    // Extract & deduplicate colors
    const rawColors: string[] = [];
    if (branding.colors) {
      for (const val of Object.values(branding.colors)) {
        if (typeof val === 'string' && val.startsWith('#')) rawColors.push(val);
      }
    }
    const colors = deduplicateColors(rawColors);

    // Extract fonts
    const fonts: string[] = [];
    if (branding.fonts) {
      for (const f of branding.fonts) {
        if (f?.family) fonts.push(f.family);
      }
    } else if (branding.typography?.fontFamilies) {
      for (const val of Object.values(branding.typography.fontFamilies)) {
        if (typeof val === 'string') fonts.push(val);
      }
    }

    // Extract social profiles (links + markdown fallback)
    const socialProfiles = extractSocialProfiles(links, markdown);

    // Better value proposition extraction
    const valueProps = extractValueProps(markdown);

    // Rich data fields
    const colorScheme = branding.colorScheme || null;
    const typography = branding.typography || null;
    const buttonStyles = branding.components || null;
    const spacing = branding.spacing || null;
    const brandPersonality = branding.personality || null;
    const designFramework = branding.designSystem?.framework || null;

    // Save using service role
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const competitorData = {
      brand_kit_id: brandKitId,
      user_id: userId,
      url: formattedUrl,
      name,
      description,
      logo_url: logoUrl,
      brand_colors: colors,
      fonts: [...new Set(fonts)],
      tagline,
      value_propositions: valueProps,
      social_profiles: socialProfiles,
      color_scheme: colorScheme,
      typography,
      button_styles: buttonStyles,
      spacing,
      brand_personality: brandPersonality,
      design_framework: designFramework,
      raw_scrape_data: { branding, metadata },
    };

    const { data: inserted, error: insertError } = await serviceClient
      .from('brand_kit_competitors')
      .insert(competitorData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct token
    try {
      await serviceClient.rpc('deduct_token' as any, { p_user_id: userId, p_function_name: 'scrape-competitor' } as any);
    } catch (e) {
      console.warn('Token deduction skipped:', e);
    }

    return new Response(JSON.stringify({ success: true, data: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
