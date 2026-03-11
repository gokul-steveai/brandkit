import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChangelogEntry {
  id: string;
  entry_type: 'new_release' | 'improvement' | 'retired';
  title: string;
  slug: string;
  summary: string;
  content: string;
  image_url: string | null;
  tags: string[];
  read_time_minutes: number | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

interface UseChangelogFilters {
  entryType?: string;
  tags?: string[];
  year?: number;
  month?: number;
}

export function useChangelog(filters?: UseChangelogFilters) {
  return useQuery({
    queryKey: ['changelog', filters],
    queryFn: async () => {
      let query = supabase
        .from('changelog_entries')
        .select('*')
        .order('published_at', { ascending: false });

      if (filters?.entryType && filters.entryType !== 'all') {
        query = query.eq('entry_type', filters.entryType);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters?.year) {
        const startDate = new Date(filters.year, filters.month ?? 0, 1);
        const endDate = filters.month !== undefined
          ? new Date(filters.year, filters.month + 1, 0)
          : new Date(filters.year, 11, 31);
        
        query = query
          .gte('published_at', startDate.toISOString())
          .lte('published_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ChangelogEntry[];
    },
  });
}

export function useChangelogEntry(slug: string) {
  return useQuery({
    queryKey: ['changelog-entry', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as ChangelogEntry;
    },
    enabled: !!slug,
  });
}

export function useChangelogYears() {
  return useQuery({
    queryKey: ['changelog-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('published_at')
        .order('published_at', { ascending: false });

      if (error) throw error;

      const years = [...new Set(
        data.map(entry => new Date(entry.published_at).getFullYear())
      )];

      return years;
    },
  });
}
