import { CHANGELOG_TAGS, type ChangelogTagKey } from '@/lib/changelog';
import { Badge } from '@/components/ui/badge';

interface ChangelogTagBadgeProps {
  tag: string;
  className?: string;
}

export function ChangelogTagBadge({ tag, className }: ChangelogTagBadgeProps) {
  const config = CHANGELOG_TAGS[tag as ChangelogTagKey];
  
  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {tag}
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.colorClass} border ${className ?? ''}`}
    >
      {config.label}
    </Badge>
  );
}
