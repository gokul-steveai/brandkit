import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { EntryTypeBadge } from './EntryTypeBadge';
import { ChangelogTagBadge } from './ChangelogTagBadge';
import type { EntryType } from '@/lib/changelog';

interface ChangelogEntryCardProps {
  entry: {
    id: string;
    entry_type: EntryType;
    title: string;
    slug: string;
    summary: string;
    tags: string[];
    published_at: string;
  };
}

export function ChangelogEntryCard({ entry }: ChangelogEntryCardProps) {
  const publishedDate = new Date(entry.published_at);
  
  return (
    <Link 
      to={`/changelog/${entry.slug}`}
      className="group flex gap-4 border-b border-border py-4 transition-colors hover:bg-muted/50"
    >
      <div className="w-20 flex-shrink-0 text-sm text-muted-foreground">
        <div className="font-medium uppercase">
          {format(publishedDate, 'MMM')}
        </div>
        <div className="text-2xl font-bold text-foreground">
          {format(publishedDate, 'dd')}
        </div>
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <EntryTypeBadge type={entry.entry_type} />
        </div>
        
        <h3 className="text-lg font-semibold group-hover:text-primary">
          {entry.title}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {entry.summary}
        </p>
        
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {entry.tags.slice(0, 3).map((tag) => (
              <ChangelogTagBadge key={tag} tag={tag} />
            ))}
            {entry.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{entry.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
