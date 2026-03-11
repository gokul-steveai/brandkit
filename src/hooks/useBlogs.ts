import { useQuery } from '@tanstack/react-query';
import { BlogsService } from '@leafpad/blogs';

const blogsApi = new BlogsService('insights');

export function useBlogs() {
  return useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      const { posts } = await blogsApi.fetchPosts({ includeHtml: true });
      return posts;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ['blog', slug],
    queryFn: async () => {
      return blogsApi.fetchBlog(slug, { includeHtml: true });
    },
    staleTime: 1000 * 60 * 60,
    enabled: !!slug,
  });
}
