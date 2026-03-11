import { useParams, Navigate } from 'react-router-dom';
import { BlogPostFormat } from '@leafpad/blogs';
import '@leafpad/blogs/src/styles/style.css';
import { useBlogPost } from '@/hooks/useBlogs';
import { SEOHead } from '@/components/seo';
import { generateArticleSchema } from '@/lib/seo/schemas';
import { SEO_CONFIG } from '@/lib/seo/constants';
import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';
import { Skeleton } from '@/components/ui/skeleton';

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useBlogPost(slug || '');

  if (!slug) {
    return <Navigate to="/blogs" replace />;
  }

  if (error || (!isLoading && !post)) {
    return <Navigate to="/not-found" replace />;
  }

  const seoData = post?.seo;
  const title = seoData?.title || post?.name || 'Blog Post';
  const description = seoData?.description || '';
  const image = seoData?.image || SEO_CONFIG.defaultImage;
  const keywords = seoData?.keywords 
    ? seoData.keywords 
    : post?.tags?.map((t) => t.name) || [];

  const articleSchema = post ? generateArticleSchema({
    title,
    description,
    image,
    datePublished: new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    url: `${SEO_CONFIG.baseUrl}/blogs/${post.slug}`,
  }) : undefined;

  return (
    <div className="min-h-screen bg-background">
      {post && (
        <SEOHead
          title={title}
          description={description}
          canonicalUrl={`/blogs/${post.slug}`}
          ogImage={image}
          ogType="article"
          publishedTime={new Date(post.createdAt).toISOString()}
          modifiedTime={new Date(post.updatedAt).toISOString()}
          keywords={keywords}
          jsonLd={articleSchema}
        />
      )}
      
      <LandingNavbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {isLoading && (
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-96 w-full" />
          </div>
        )}
        
        {post && (
          <article
            className="leafpad-blogs max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{ 
              __html: BlogPostFormat.completeBlogPost({ post, toc: true }) 
            }} 
          />
        )}
      </main>
      
      <FooterSection />
    </div>
  );
}

export default BlogPost;
