import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentationPage {
  id: string;
  slug: string;
  parent_slug: string | null;
  section: string;
  title: string;
  description: string | null;
  content_markdown: string;
  icon: string | null;
  display_order: number;
  badge: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocNavSection {
  id: string;
  label: string;
  items: {
    slug: string;
    title: string;
    badge: string | null;
  }[];
}

const SECTION_LABELS: Record<string, string> = {
  tutorials: "Getting Started",
  "how-to": "How-to Guides",
  reference: "Reference",
  concepts: "Concepts",
};

const SECTION_ORDER = ["tutorials", "how-to", "reference", "concepts"];

export function useDocumentationNav() {
  return useQuery({
    queryKey: ["documentation", "nav"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_pages")
        .select("slug, parent_slug, section, title, badge, display_order")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Group by section
      const sections: DocNavSection[] = SECTION_ORDER.map((sectionId) => ({
        id: sectionId,
        label: SECTION_LABELS[sectionId] || sectionId,
        items: (data || [])
          .filter((page) => page.section === sectionId)
          .map((page) => ({
            slug: page.slug,
            title: page.title,
            badge: page.badge,
          })),
      })).filter((section) => section.items.length > 0);

      return sections;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDocumentationPage(slug: string | undefined) {
  return useQuery({
    queryKey: ["documentation", "page", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("documentation_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data as DocumentationPage;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDocumentationIndex() {
  return useQuery({
    queryKey: ["documentation", "index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_pages")
        .select("slug, title, description, section, badge")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Group by section for the index page
      const grouped = SECTION_ORDER.reduce(
        (acc, sectionId) => {
          acc[sectionId] = {
            label: SECTION_LABELS[sectionId] || sectionId,
            pages: (data || []).filter((page) => page.section === sectionId),
          };
          return acc;
        },
        {} as Record<string, { label: string; pages: typeof data }>
      );

      return grouped;
    },
    staleTime: 5 * 60 * 1000,
  });
}
