import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://brandkitos.com';
const LAST_UPDATED = '2026-02-16';

const staticRoutes = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/blogs', priority: '0.8', changefreq: 'daily' },
  { loc: '/changelog', priority: '0.7', changefreq: 'weekly' },
  { loc: '/documentation', priority: '0.8', changefreq: 'weekly' },
  { loc: '/free-tools/instagram-analysis-wizard', priority: '0.7', changefreq: 'monthly' },
  { loc: '/privacy', priority: '0.2', changefreq: 'yearly' },
  { loc: '/terms', priority: '0.2', changefreq: 'yearly' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch changelog entries
    const { data: changelogEntries } = await supabase
      .from('changelog_entries')
      .select('slug, updated_at')
      .order('published_at', { ascending: false });

    // Fetch documentation pages
    const { data: docPages } = await supabase
      .from('documentation_pages')
      .select('slug, updated_at')
      .eq('is_published', true);

    // Fetch blog posts from Leafpad API (graceful degradation)
    let blogPosts: { slug: string; updatedAt?: string }[] = [];
    try {
      const res = await fetch('https://api.leafpad.io/v1/blogs/insights/posts');
      if (res.ok) {
        const data = await res.json();
        blogPosts = (data.posts || []).map((p: any) => ({
          slug: p.slug,
          updatedAt: p.updatedAt || p.updated_at,
        }));
      }
    } catch {
      // Blog fetch failed — continue without blog posts
    }

    // Build URL entries
    const urls: string[] = [];

    // Static routes
    for (const route of staticRoutes) {
      urls.push(`
  <url>
    <loc>${BASE_URL}${route.loc}</loc>
    <lastmod>${LAST_UPDATED}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
    }

    // Changelog entries
    if (changelogEntries) {
      for (const entry of changelogEntries) {
        urls.push(`
  <url>
    <loc>${BASE_URL}/changelog/${entry.slug}</loc>
    <lastmod>${new Date(entry.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);
      }
    }

    // Documentation pages (slug already contains section prefix)
    if (docPages) {
      for (const page of docPages) {
        urls.push(`
  <url>
    <loc>${BASE_URL}/documentation/${page.slug}</loc>
    <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
      }
    }

    // Blog posts
    for (const post of blogPosts) {
      const lastmod = post.updatedAt
        ? new Date(post.updatedAt).toISOString().split('T')[0]
        : LAST_UPDATED;
      urls.push(`
  <url>
    <loc>${BASE_URL}/blogs/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500, headers: corsHeaders });
  }
});
