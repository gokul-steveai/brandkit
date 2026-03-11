import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useChangelog, useChangelogYears } from '@/hooks/useChangelog';
import { ChangelogFilters } from './ChangelogFilters';
import { ChangelogTagFilter } from './ChangelogTagFilter';
import { ChangelogEntryCard } from './ChangelogEntryCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ChangelogList() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();

  const { data: entries, isLoading } = useChangelog({
    entryType: activeFilter,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    year: selectedYear,
  });

  const { data: years } = useChangelogYears();

  // Group entries by month
  const groupedEntries = useMemo(() => {
    if (!entries) return {};
    
    return entries.reduce((groups, entry) => {
      const monthYear = format(new Date(entry.published_at), 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(entry);
      return groups;
    }, {} as Record<string, typeof entries>);
  }, [entries]);

  const currentYearIndex = years?.indexOf(selectedYear ?? years[0]) ?? 0;

  const handlePrevYear = () => {
    if (years && currentYearIndex < years.length - 1) {
      setSelectedYear(years[currentYearIndex + 1]);
    }
  };

  const handleNextYear = () => {
    if (years && currentYearIndex > 0) {
      setSelectedYear(years[currentYearIndex - 1]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <ChangelogFilters 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter} 
        />
        <ChangelogTagFilter 
          selectedTags={selectedTags} 
          onTagsChange={setSelectedTags} 
        />
      </div>

      {/* Entries grouped by month */}
      {Object.keys(groupedEntries).length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No changelog entries found.</p>
          <p className="mt-2 text-sm">Check back soon for updates!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([monthYear, monthEntries]) => (
            <div key={monthYear}>
              <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
                {monthYear}
              </h2>
              <div className="divide-y divide-border">
                {monthEntries.map((entry) => (
                  <ChangelogEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Year navigation */}
      {years && years.length > 0 && (
        <div className="flex items-center justify-center gap-4 border-t pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevYear}
            disabled={currentYearIndex >= years.length - 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {years.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year || (!selectedYear && year === years[0]) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextYear}
            disabled={currentYearIndex <= 0}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
