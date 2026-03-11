import { Outlet, useParams } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FooterSection from "@/components/landing/FooterSection";
import { DocSidebar, DocContent, DocIndex } from "@/components/documentation";
import { 
  useDocumentationNav, 
  useDocumentationPage, 
  useDocumentationIndex 
} from "@/hooks/useDocumentation";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/seo";
import { generateBreadcrumbSchema } from "@/lib/seo/schemas";

export function DocumentationLayout() {
  const { section, slug } = useParams();
  const fullSlug = section && slug ? `${section}/${slug}` : undefined;
  
  const { data: navSections, isLoading: navLoading } = useDocumentationNav();
  const { data: page, isLoading: pageLoading } = useDocumentationPage(fullSlug);
  const { data: indexSections, isLoading: indexLoading } = useDocumentationIndex();

  const isPageView = !!fullSlug;

  // Dynamic SEO based on whether viewing index or specific page
  const seoTitle = isPageView && page 
    ? `${page.title} - Documentation`
    : "Documentation - Brand Kit OS";
  const seoDescription = isPageView && page
    ? page.description || `Learn about ${page.title} in Brand Kit OS documentation.`
    : "Learn how to build, manage, and export your AI-native brand kit. Comprehensive guides for ChatGPT, Claude, and MCP integration.";
  const seoCanonical = isPageView && fullSlug
    ? `/documentation/${fullSlug}`
    : "/documentation";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={seoCanonical}
        keywords={['documentation', 'brand kit guide', 'AI integration', 'ChatGPT setup', 'Claude integration', 'MCP server']}
        jsonLd={isPageView && page ? generateBreadcrumbSchema([
          { name: 'Documentation', url: '/documentation' },
          { name: page.title, url: `/documentation/${fullSlug}` },
        ]) : undefined}
      />
      <LandingNavbar />
      
      <div className="flex flex-1">
        <DocSidebar sections={navSections || []} isLoading={navLoading} />
        
        <main className="flex-1 overflow-auto">
          {isPageView ? (
            pageLoading ? (
              <div className="max-w-4xl mx-auto py-8 px-6 space-y-4">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-10 w-96" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : page ? (
              <DocContent page={page} />
            ) : (
              <div className="max-w-4xl mx-auto py-8 px-6">
                <h1 className="text-2xl font-bold">Page not found</h1>
                <p className="text-muted-foreground mt-2">
                  The documentation page you're looking for doesn't exist.
                </p>
              </div>
            )
          ) : (
            <DocIndex sections={indexSections || {}} isLoading={indexLoading} />
          )}
        </main>
      </div>
      
      <FooterSection />
    </div>
  );
}

export default DocumentationLayout;
