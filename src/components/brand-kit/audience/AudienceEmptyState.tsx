import { Users } from 'lucide-react';
import { EmptyStateCard } from '@/components/brand-kit/shared';

interface AudienceEmptyStateProps {
  onAddFirst: () => void;
}

export function AudienceEmptyState({ onAddFirst }: AudienceEmptyStateProps) {
  return (
    <EmptyStateCard
      icon={Users}
      title="No personas yet"
      description="Define your target audience personas to guide brand messaging"
      buttonText="Add First Persona"
      onAction={onAddFirst}
    />
  );
}
