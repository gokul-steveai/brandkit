import { useOutletContext } from 'react-router-dom';
import { BrandKit } from '@/hooks/useBrandKits';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { VisualAssetsSection } from './VisualAssetsSection';

export function VisualAssetsPage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();

  return (
    <FeatureGate feature="visualAssets" brandKitId={brandKit.id}>
      <div className="space-y-6">
        <VisualAssetsSection />
      </div>
    </FeatureGate>
  );
}
