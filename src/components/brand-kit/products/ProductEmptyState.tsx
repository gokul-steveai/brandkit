import { Package } from 'lucide-react';
import { EmptyStateCard } from '@/components/brand-kit/shared';

interface ProductEmptyStateProps {
  onAddFirst: () => void;
}

export function ProductEmptyState({ onAddFirst }: ProductEmptyStateProps) {
  return (
    <EmptyStateCard
      icon={Package}
      title="No products yet"
      description="Add your products and services to define their positioning"
      buttonText="Add First Product"
      onAction={onAddFirst}
    />
  );
}
