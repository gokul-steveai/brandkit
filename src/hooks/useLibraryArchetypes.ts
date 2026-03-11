import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ArchetypeCategory = 'core' | 'functional_collective' | 'relational_emotional';

export interface LibraryArchetype {
  id: string;
  name: string;
  category: ArchetypeCategory;
  role_type: string;
  key_traits: string[];
  llm_instruction: string;
  description: string | null;
  is_library: boolean;
  user_id: string | null;
  usage_count: number;
  created_at: string;
}

export const ARCHETYPE_CATEGORY_LABELS: Record<ArchetypeCategory, string> = {
  core: 'Core',
  functional_collective: 'Functional & Collective',
  relational_emotional: 'Relational & Emotional',
};

export const ARCHETYPE_CATEGORY_DESCRIPTIONS: Record<ArchetypeCategory, string> = {
  core: 'Primary axes of variation - most stable and reliable across models',
  functional_collective: 'Balance between individual expression and systematic roles',
  relational_emotional: 'Spectrum between empathy/connection and logical approaches',
};

export function useLibraryArchetypes(category?: ArchetypeCategory) {
  return useQuery({
    queryKey: ['library-archetypes', category],
    queryFn: async (): Promise<LibraryArchetype[]> => {
      let query = supabase
        .from('library_archetypes')
        .select('*')
        .order('name');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching archetypes:', error);
        throw error;
      }
      
      return (data || []) as LibraryArchetype[];
    },
  });
}

export function useArchetype(archetypeId: string | null | undefined) {
  return useQuery({
    queryKey: ['archetype', archetypeId],
    queryFn: async (): Promise<LibraryArchetype | null> => {
      if (!archetypeId) return null;
      
      const { data, error } = await supabase
        .from('library_archetypes')
        .select('*')
        .eq('id', archetypeId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching archetype:', error);
        throw error;
      }
      
      return data as LibraryArchetype | null;
    },
    enabled: !!archetypeId,
  });
}
