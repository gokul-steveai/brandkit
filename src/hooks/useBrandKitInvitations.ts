import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';

export interface BrandKitInvitation {
  id: string;
  brand_kit_id: string;
  invited_by: string;
  token: string;
  role: 'viewer' | 'editor' | 'admin';
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface CreateInvitationInput {
  brand_kit_id: string;
  role: 'viewer' | 'editor' | 'admin';
  email?: string;
  expires_in_days?: number;
}

function generateSecureToken(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function useBrandKitInvitations(brandKitId: string) {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['brand-kit-invitations', brandKitId],
    queryFn: async () => {
      // Cast to any since the table was just created and types aren't regenerated yet
      const { data, error } = await (supabase as any)
        .from('brand_kit_invitations')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BrandKitInvitation[];
    },
    enabled: !!brandKitId,
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (input: CreateInvitationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const token = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (input.expires_in_days || 7));

      // Cast to any since the table was just created and types aren't regenerated yet
      const { data, error } = await (supabase as any)
        .from('brand_kit_invitations')
        .insert({
          brand_kit_id: input.brand_kit_id,
          invited_by: user.id,
          token,
          role: input.role,
          email: input.email || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as BrandKitInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-invitations', brandKitId] });
      toast({ title: 'Invitation created', description: 'Share the link with your team member.' });
    },
    onError: (error) => {
      console.error('Failed to create invitation:', error);
      toast({ title: 'Error', description: 'Failed to create invitation link.', variant: 'destructive' });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      // Cast to any since the table was just created and types aren't regenerated yet
      const { error } = await (supabase as any)
        .from('brand_kit_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-invitations', brandKitId] });
      toast({ title: 'Invitation revoked', description: 'The invitation link is no longer valid.' });
    },
    onError: (error) => {
      console.error('Failed to revoke invitation:', error);
      toast({ title: 'Error', description: 'Failed to revoke invitation.', variant: 'destructive' });
    },
  });

  return {
    invitations,
    isLoading,
    createInvitation: createInvitationMutation.mutateAsync,
    revokeInvitation: revokeInvitationMutation.mutateAsync,
    isCreating: createInvitationMutation.isPending,
    isRevoking: revokeInvitationMutation.isPending,
  };
}

export async function validateInvitation(token: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invitation?token=${encodeURIComponent(token)}`
  );
  return response.json();
}

export async function acceptInvitation(token: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ token }),
    }
  );
  return response.json();
}
