import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';

export type BrandKitMemberRole = 'viewer' | 'editor' | 'admin';

export interface BrandKitMember {
  id: string;
  brand_kit_id: string;
  user_id: string;
  role: BrandKitMemberRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}


export interface UpdateMemberInput {
  id: string;
  role: BrandKitMemberRole;
}

export function useBrandKitMembers(brandKitId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['brandKitMembers', brandKitId],
    queryFn: async () => {
      // Get members
      const { data: members, error: membersError } = await supabase
        .from('brand_kit_members')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get profiles for all member user IDs
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Map profiles to members
      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
      
      return members.map(m => ({
        ...m,
        role: m.role as BrandKitMemberRole,
        profile: profileMap.get(m.user_id) || undefined,
      })) as BrandKitMember[];
    },
    enabled: !!user && !!brandKitId,
  });

  // Note: addMember is now handled by the add-member-by-email edge function
  // called directly from ShareBrandKitDialog. This prevents direct profile queries by email.

  // Listen for invalidation events from the share dialog
  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['brandKitMembers', brandKitId] });
    };
    window.addEventListener('invalidate-brand-kit-members', handleInvalidate);
    return () => window.removeEventListener('invalidate-brand-kit-members', handleInvalidate);
  }, [queryClient, brandKitId]);

  const updateMemberMutation = useMutation({
    mutationFn: async (input: UpdateMemberInput) => {
      const { data, error } = await supabase
        .from('brand_kit_members')
        .update({ role: input.role })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKitMembers', brandKitId] });
      toast({ title: 'Member role updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update member', description: error.message, variant: 'destructive' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('brand_kit_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKitMembers', brandKitId] });
      toast({ title: 'Member removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove member', description: error.message, variant: 'destructive' });
    },
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    updateMember: updateMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    isUpdating: updateMemberMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
  };
}

// Hook to check user's role in a brand kit
export function useBrandKitRole(brandKitId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['brandKitRole', brandKitId],
    queryFn: async () => {
      if (!user) return null;

      // Check if user is the owner
      const { data: brandKit } = await supabase
        .from('brand_kits')
        .select('user_id')
        .eq('id', brandKitId)
        .single();

      if (brandKit?.user_id === user.id) {
        return 'owner' as const;
      }

      // Check membership
      const { data: member } = await supabase
        .from('brand_kit_members')
        .select('role')
        .eq('brand_kit_id', brandKitId)
        .eq('user_id', user.id)
        .maybeSingle();

      return member?.role as BrandKitMemberRole | null;
    },
    enabled: !!user && !!brandKitId,
  });
}

/**
 * Check if the current user can edit the brand kit
 * Returns true for owners, admins, and editors
 */
export function useCanEditBrandKit(brandKitId: string) {
  const { data: role, isLoading } = useBrandKitRole(brandKitId);
  
  const canEdit = role === 'owner' || role === 'admin' || role === 'editor';
  const isViewer = role === 'viewer';
  
  return { 
    canEdit, 
    isViewer, 
    role, 
    isLoading,
    isReadOnly: isViewer || (!isLoading && !role),
  };
}