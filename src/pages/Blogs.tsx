import { BlogPostFormat } from '@leafpad/blogs';
import '@leafpad/blogs/src/styles/style.css';
import { useBlogs } from '@/hooks/useBlogs';
import { SEOHead } from '@/components/seo';
import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';
import { Skeleton } from '@/components/ui/skeleton';

export function Blogs() {
  const { data: posts, isLoading, error } = useBlogs();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog - Brand Kit OS"
        description="Insights on AI brand management, brand consistency, and building AI-native brand kits."
        canonicalUrl="/blogs"
        keywords={['AI brand management', 'brand consistency', 'AI brand kit', 'brand guidelines']}
      />
      
      <LandingNavbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold mb-8">Blog</h1>
        
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        )}
        
        {error && (
          <p className="text-destructive">Failed to load blog posts.</p>
        )}
        
        {posts && posts.length > 0 && (
          <div 
            className="leafpad-blogs"
            dangerouslySetInnerHTML={{ 
              __html: BlogPostFormat.blogCards({ posts, urlPrefix: '/blogs' }) 
            }} 
          />
        )}
        
        {posts && posts.length === 0 && (
          <p className="text-muted-foreground">No blog posts found.</p>
        )}
      </main>
      
      <FooterSection />
    </div>
  );
}

export default Blogs;
