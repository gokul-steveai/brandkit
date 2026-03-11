import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap, Wrench, FileText, Lightbulb } from "lucide-react";
import { DocNavSection } from "@/hooks/useDocumentation";

interface DocSidebarProps {
  sections: DocNavSection[];
  isLoading?: boolean;
}

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  tutorials: GraduationCap,
  "how-to": Wrench,
  reference: FileText,
  concepts: Lightbulb,
};

export function DocSidebar({ sections, isLoading }: DocSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname.replace("/documentation/", "");

  if (isLoading) {
    return (
      <aside className="hidden lg:block w-64 border-r border-border shrink-0 sticky top-0 h-screen pt-16">
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block w-64 border-r border-border shrink-0 sticky top-0 h-screen pt-16">
      <ScrollArea className="h-full py-4">
        <div className="px-4 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Documentation
          </h2>
        </div>
        <nav className="space-y-1 px-2">
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section.id] || FileText;
            return (
              <div key={section.id} className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {section.label}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = currentPath === item.slug;
                    return (
                      <li key={item.slug}>
                        <Link
                          to={`/documentation/${item.slug}`}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left",
                            isActive
                              ? "bg-accent text-accent-foreground font-medium"
                              : "hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
