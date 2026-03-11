// JSON-LD Schema generators for SEO

import { SEO_CONFIG } from './constants';

interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

interface ArticleSchemaProps {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified: string;
  url: string;
}

export function generateArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  url,
}: ArticleSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "image": image,
    "datePublished": datePublished,
    "dateModified": dateModified,
    "author": {
      "@type": "Organization",
      "name": SEO_CONFIG.siteName
    },
    "publisher": {
      "@type": "Organization",
      "name": SEO_CONFIG.siteName,
      "logo": {
        "@type": "ImageObject",
        "url": SEO_CONFIG.logoUrl
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${SEO_CONFIG.baseUrl}${item.url}`
    }))
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SEO_CONFIG.baseUrl}/#organization`,
    "name": SEO_CONFIG.siteName,
    "url": SEO_CONFIG.baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": SEO_CONFIG.logoUrl
    },
    "sameAs": [
      "https://twitter.com/brand_kit_OS"
    ]
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SEO_CONFIG.baseUrl}/#website`,
    "url": SEO_CONFIG.baseUrl,
    "name": SEO_CONFIG.siteName,
    "publisher": { "@id": `${SEO_CONFIG.baseUrl}/#organization` }
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": SEO_CONFIG.siteName,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": SEO_CONFIG.baseUrl,
    "description": "AI-native brand management platform. Build and share your brand across ChatGPT, Claude, and 50+ AI platforms.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free",
        "price": "0",
        "priceCurrency": "USD"
      },
      {
        "@type": "Offer",
        "name": "Base",
        "price": "19",
        "priceCurrency": "USD",
        "billingIncrement": "P1M"
      },
      {
        "@type": "Offer",
        "name": "Premium",
        "price": "59",
        "priceCurrency": "USD",
        "billingIncrement": "P1M"
      }
    ]
  };
}
