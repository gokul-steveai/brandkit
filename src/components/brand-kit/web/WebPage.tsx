import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandKit } from '@/hooks/useBrandKits';
import { SocialPage } from '@/components/brand-kit/social';
import { CompetitorCard } from './CompetitorCard';
import { SEOCard } from './SEOCard';

export function WebPage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const [activeTab, setActiveTab] = useState('social');

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="social">Social Profiles</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="mt-6">
          <SocialPage />
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          <CompetitorCard brandKitId={brandKit.id} />
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <SEOCard brandKitId={brandKit.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
