import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';

const DEFAULT_PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BrandKit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  additional_colors: any;
  background_color: string | null;
  text_primary_color: string | null;
  text_secondary_color: string | null;
  link_color: string | null;
  color_scheme: string | null;
  heading_font: string | null;
  body_font: string | null;
  paragraph_font: string | null;
  font_sizes: any;
  font_weights: any;
  fonts_list: any;
  spacing: any;
  button_styles: any;
  input_styles: any;
  personality: any;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  brand_voice: string | null;
  tagline: string | null;
  summary: string | null;
  raw_scrape_path: string | null;
  completion_percentage: number;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
  // Custom color slots
  custom_1_color: string | null;
  custom_1_name: string | null;
  custom_2_color: string | null;
  custom_2_name: string | null;
  custom_3_color: string | null;
  custom_3_name: string | null;
  custom_4_color: string | null;
  custom_4_name: string | null;
  // Social media URLs extracted from website
  brand_kit_social_urls: any;
  // Unified color details with light/dark mode support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color_details: any;
}

export interface CreateBrandKitInput {
  name: string;
  description?: string;
  website_url?: string;
}

export interface UpdateBrandKitInput extends Partial<Omit<BrandKit, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {
  id: string;
}

function calculateCompletion(kit: Partial<BrandKit>): number {
  const fields = [
    'name', 'description', 'primary_color', 'secondary_color', 'accent_color',
    'heading_font', 'body_font', 'logo_url', 'tagline', 'brand_voice',
    'background_color', 'text_primary_color', 'personality', 'summary'
  ];
  
  const filledCount = fields.filter(field => {
    const value = kit[field as keyof typeof kit];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value === '') return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }).length;
  
  return Math.round((filledCount / fields.length) * 100);
}

async function triggerWebhookForChanges(brand_kit_id: string): Promise<void> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (!error && session) {
    await supabase.functions.invoke('partner-webhook/trigger', {
      body: { brand_kit_id },
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
  }
}

export function useBrandKits(pageSize = DEFAULT_PAGE_SIZE) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['brandKits', pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('brand_kits')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data as BrandKit[], count: count ?? 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.count / pageSize);
      return lastPage.page + 1 < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes - prevents unnecessary refetches
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateBrandKitInput) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('brand_kits')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          website_url: input.website_url || null,
          completion_percentage: calculateCompletion(input)
        })
        .select()
        .single();

      if (error) throw error;
      return data as BrandKit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
      toast({ title: 'Brand kit created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create brand kit', description: error.message, variant: 'destructive' });
    }
  });

  const allBrandKits = infiniteQuery.data?.pages.flatMap(page => page.data) ?? [];
  const totalCount = infiniteQuery.data?.pages[0]?.count ?? 0;

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateBrandKitInput) => {
      const { id, ...updates } = input;
      
      // Recalculate completion percentage
      const currentKit = allBrandKits.find(k => k.id === id);
      const mergedKit = { ...currentKit, ...updates };
      const completionPercentage = calculateCompletion(mergedKit);

      const { data, error } = await supabase
        .from('brand_kits')
        .update({ ...updates, completion_percentage: completionPercentage })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BrandKit;
    },
    onSuccess: async (data: BrandKit) => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
      queryClient.invalidateQueries({ queryKey: ['brandKit'] });
      toast({ title: 'Brand kit updated successfully' });

      await triggerWebhookForChanges(data.id)
    },
    onError: (error) => {
      toast({ title: 'Failed to update brand kit', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brand_kits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
      toast({ title: 'Brand kit deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete brand kit', description: error.message, variant: 'destructive' });
    }
  });

  return {
    brandKits: allBrandKits,
    totalCount,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    error: infiniteQuery.error,
    createBrandKit: createMutation.mutateAsync,
    updateBrandKit: updateMutation.mutateAsync,
    deleteBrandKit: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

export function useBrandKit(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['brandKit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as BrandKit;
    },
    enabled: !!user && !!id
  });
}
