import { Sparkles, Wrench, AlertTriangle } from 'lucide-react';
import { ENTRY_TYPES, type EntryType } from '@/lib/changelog';
import { Badge } from '@/components/ui/badge';

interface EntryTypeBadgeProps {
  type: EntryType;
  className?: string;
}

const iconMap = {
  'new_release': Sparkles,
  'improvement': Wrench,
  'retired': AlertTriangle,
} as const;

export function EntryTypeBadge({ type, className }: EntryTypeBadgeProps) {
  const config = ENTRY_TYPES[type];
  const Icon = iconMap[type];
  
  return (
    <Badge variant="outline" className={`gap-1.5 ${config.badgeClass} ${className ?? ''}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
