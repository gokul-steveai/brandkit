import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Wrench, FileText, Lightbulb, ChevronRight } from "lucide-react";

interface DocIndexProps {
  sections: Record<
    string,
    {
      label: string;
      pages: Array<{
        slug: string;
        title: string;
        description: string | null;
        badge: string | null;
      }>;
    }
  >;
  isLoading?: boolean;
}

const SECTION_ICONS: Record<string, typeof GraduationCap> = {
  tutorials: GraduationCap,
  "how-to": Wrench,
  reference: FileText,
  concepts: Lightbulb,
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  tutorials: "Learn the basics and get started with Brand Kit OS",
  "how-to": "Step-by-step guides for specific tasks",
  reference: "Technical documentation and API references",
  concepts: "Understand the core concepts and principles",
};

export function DocIndex({ sections, isLoading }: DocIndexProps) {
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sectionOrder = ["tutorials", "how-to", "reference", "concepts"];

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Documentation</h1>
        <p className="text-muted-foreground text-lg">
          Learn how to get the most out of Brand Kit OS with our guides and reference materials.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sectionOrder.map((sectionId) => {
          const section = sections[sectionId];
          if (!section || section.pages.length === 0) return null;

          const Icon = SECTION_ICONS[sectionId] || FileText;

          return (
            <Card key={sectionId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {section.label}
                </CardTitle>
                <CardDescription>
                  {SECTION_DESCRIPTIONS[sectionId]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        to={`/documentation/${page.slug}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{page.title}</span>
                            {page.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {page.badge}
                              </Badge>
                            )}
                          </div>
                          {page.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {page.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
