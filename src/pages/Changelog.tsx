import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';
import { ChangelogList } from '@/components/changelog';
import { SEOHead } from '@/components/seo';

export default function Changelog() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Changelog - Product Updates"
        description="Track all updates, improvements, and new features in Brand Kit OS. See what's new in our AI-native brand kit platform."
        canonicalUrl="/changelog"
        keywords={['changelog', 'updates', 'new features', 'brand kit updates', 'AI brand management']}
      />
      <LandingNavbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Changelog</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Track all updates, improvements, and changes to Brand Kit OS.
          </p>
        </div>
        
        <ChangelogList />
      </main>
      
      <FooterSection />
    </div>
  );
}
