import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyMarkdownButton } from "./CopyMarkdownButton";
import { DocBreadcrumb } from "./DocBreadcrumb";
import { DocumentationPage } from "@/hooks/useDocumentation";
import { format } from "date-fns";

interface DocContentProps {
  page: DocumentationPage;
}

const SECTION_LABELS: Record<string, string> = {
  tutorials: "Getting Started",
  "how-to": "How-to Guides",
  reference: "Reference",
  concepts: "Concepts",
};

export function DocContent({ page }: DocContentProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <DocBreadcrumb
        section={page.section}
        sectionLabel={SECTION_LABELS[page.section] || page.section}
        title={page.title}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              {page.title}
              {page.badge && (
                <Badge variant="secondary">{page.badge}</Badge>
              )}
            </CardTitle>
            {page.description && (
              <CardDescription className="mt-2">{page.description}</CardDescription>
            )}
            {page.updated_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {format(new Date(page.updated_at), "MMMM d, yyyy")}
              </p>
            )}
          </div>
          <CopyMarkdownButton markdown={page.content_markdown} title={page.title} />
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-table:overflow-x-auto prose-table:block">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Customize table rendering for better styling
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full">{children}</table>
                </div>
              ),
              // Customize code blocks
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className}>
                    {children}
                  </code>
                );
              },
              // Customize pre blocks
              pre: ({ children }) => (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  {children}
                </pre>
              ),
            }}
          >
            {page.content_markdown}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
