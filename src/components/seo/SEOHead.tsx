import { Helmet } from 'react-helmet-async';
import { SEO_CONFIG } from '@/lib/seo/constants';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: string[];
  noindex?: boolean;
  jsonLd?: object | object[];
}

export function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = SEO_CONFIG.defaultImage,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  keywords = [],
  noindex = false,
  jsonLd,
}: SEOHeadProps) {
  const fullTitle = title.includes('Brand Kit OS') 
    ? title 
    : `${title} | Brand Kit OS`;
  const fullCanonical = canonicalUrl 
    ? `${SEO_CONFIG.baseUrl}${canonicalUrl}` 
    : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SEO_CONFIG.siteName} />
      
      {/* Article specific */}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SEO_CONFIG.twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
