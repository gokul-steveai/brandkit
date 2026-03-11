import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Clock } from 'lucide-react';
import { useChangelogEntry } from '@/hooks/useChangelog';
import { EntryTypeBadge } from './EntryTypeBadge';
import { ChangelogTagBadge } from './ChangelogTagBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChangelogDetailProps {
  slug: string;
}

export function ChangelogDetail({ slug }: ChangelogDetailProps) {
  const { data: entry, isLoading, error } = useChangelogEntry(slug);

  // Extract headings for table of contents
  const tableOfContents = useMemo(() => {
    if (!entry?.content) return [];
    
    const headingRegex = /^#{2,3}\s+(.+)$/gm;
    const headings: { level: number; text: string; id: string }[] = [];
    let match;
    
    while ((match = headingRegex.exec(entry.content)) !== null) {
      const level = match[0].indexOf(' ');
      const text = match[1];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      headings.push({ level, text, id });
    }
    
    return headings;
  }, [entry?.content]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Entry not found</h2>
        <p className="mt-2 text-muted-foreground">
          The changelog entry you're looking for doesn't exist.
        </p>
        <Button asChild className="mt-4">
          <Link to="/changelog">Back to Changelog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_250px]">
      {/* Main content */}
      <article className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/changelog">
            <ArrowLeft className="h-4 w-4" />
            Back to Changelog
          </Link>
        </Button>

        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <EntryTypeBadge type={entry.entry_type} />
            <span className="text-sm text-muted-foreground">
              {format(new Date(entry.published_at), 'MMMM d, yyyy')}
            </span>
            {entry.read_time_minutes && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {entry.read_time_minutes} min read
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold lg:text-4xl">{entry.title}</h1>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <ChangelogTagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </header>

        {entry.image_url && (
          <img
            src={entry.image_url}
            alt={entry.title}
            className="w-full rounded-lg border"
          />
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:underline-offset-2 prose-li:marker:text-muted-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h2 id={id}>{children}</h2>;
              },
              h3: ({ children }) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h3 id={id}>{children}</h3>;
              },
            }}
          >
            {entry.content}
          </ReactMarkdown>
        </div>
      </article>

      {/* Table of contents sidebar */}
      {tableOfContents.length > 0 && (
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h4 className="mb-4 text-sm font-semibold">On this page</h4>
            <nav className="space-y-2">
              {tableOfContents.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`block text-sm text-muted-foreground transition-colors hover:text-foreground ${
                    heading.level === 3 ? 'pl-4' : ''
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}
