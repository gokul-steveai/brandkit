import { Globe, Sparkles, Wrench, AlertTriangle } from 'lucide-react';
import { FILTER_TABS } from '@/lib/changelog';
import { Button } from '@/components/ui/button';

interface ChangelogFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const iconMap = {
  Globe,
  Sparkles,
  Wrench,
  AlertTriangle,
} as const;

export function ChangelogFilters({ activeFilter, onFilterChange }: ChangelogFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_TABS.map((tab) => {
        const Icon = iconMap[tab.icon];
        const isActive = activeFilter === tab.value;
        
        return (
          <Button
            key={tab.value}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(tab.value)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
