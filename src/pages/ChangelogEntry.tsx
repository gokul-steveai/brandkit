import { useParams } from 'react-router-dom';
import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';
import { ChangelogDetail } from '@/components/changelog';
import { SEOHead } from '@/components/seo';

export default function ChangelogEntry() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={slug ? `${slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - Changelog` : 'Changelog Entry'}
        description="Track updates, improvements, and new features in Brand Kit OS."
        canonicalUrl={slug ? `/changelog/${slug}` : '/changelog'}
        ogType="article"
      />
      <LandingNavbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        {slug && <ChangelogDetail slug={slug} />}
      </main>
      
      <FooterSection />
    </div>
  );
}
