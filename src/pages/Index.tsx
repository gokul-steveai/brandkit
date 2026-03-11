import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SEOHead } from '@/components/seo';
import { generateOrganizationSchema, generateWebSiteSchema, generateFAQSchema } from '@/lib/seo/schemas';
import { generateSoftwareApplicationSchema } from '@/lib/seo/schemas';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import PainPointsSection from '@/components/landing/PainPointsSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ComparisonTable from '@/components/landing/ComparisonTable';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import StatsSection from '@/components/landing/StatsSection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import FooterSection from '@/components/landing/FooterSection';

const homepageFaqs = [
  {
    question: "How is Brand Kit OS different from Canva's brand kit?",
    answer: "Canva's brand kit is limited to their platform. Brand Kit OS works across 50+ platforms and includes AI agent integration, automated compliance checking, and developer APIs that Canva doesn't offer.",
  },
  {
    question: 'What is an MCP server and why do I need it?',
    answer: 'MCP (Model Context Protocol) is the new standard for AI agent integration. Our MCP server means your brand automatically works with ChatGPT, Claude, and other AI tools without manual setup.',
  },
  {
    question: 'Can I integrate Brand Kit OS with my existing tools?',
    answer: 'Yes! We have native integrations with 50+ platforms and comprehensive APIs for custom integrations. Our developer team can help with complex setups.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most teams are up and running in under 30 minutes. Our AI-powered setup wizard guides you through brand kit creation and platform connections.',
  },
];

const homepageJsonLd = [
  generateOrganizationSchema(),
  generateWebSiteSchema(),
  generateSoftwareApplicationSchema(),
  generateFAQSchema(homepageFaqs),
];

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Brand Kit OS - AI-Native Brand Management"
        description="Build and share your brand across ChatGPT, Claude, and 50+ AI platforms. The first brand kit designed for AI-first businesses."
        canonicalUrl="/"
        jsonLd={homepageJsonLd}
      />
      <LandingNavbar />
      <main>
        <HeroSection />
        <PainPointsSection />
        <FeaturesSection />
        <ComparisonTable />
        <TestimonialsSection />
        <StatsSection />
        <PricingSection />
        <FAQSection />
        <FooterSection />
      </main>
    </div>
  );
};

export default Index;
