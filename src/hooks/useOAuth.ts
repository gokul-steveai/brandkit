import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { generateSecureKey, sha256Hex } from '@/lib/utils';

export interface CreateClientData {
  partner_name: string;
  redirect_uris: string[];
}

interface UpdateUrisData {
  clientId: string;
  redirectUris: string[];
}

const validateRedirectUris = (uris: string[]): string[] => {
  const errors: string[] = [];
  
  uris.forEach((uri, index) => {
    try {
      const url = new URL(uri);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`URI ${index + 1}: Must use HTTP or HTTPS protocol`);
      }
      if (url.hostname === 'localhost' && url.protocol === 'http:') {
        return;
      }
      if (url.protocol === 'http:' && url.hostname !== 'localhost') {
        errors.push(`URI ${index + 1}: HTTP only allowed for localhost`);
      }
    } catch (error) {
      errors.push(`URI ${index + 1}: Invalid URL format`);
    }
  });
  
  return errors;
};

export function useBrandKits(enabled: boolean) {
  return useQuery({
    queryKey: ['brand-kits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled,
  });
}

export function useOAuthClients(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['oauth-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oauth_clients')
        .select('id, client_id, partner_name, redirect_uris, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateClientData) => {
      const validationErrors = validateRedirectUris(input.redirect_uris);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const clientId = `client_${generateSecureKey()}`;
      const clientSecret = `secret_${generateSecureKey()}`;
      const clientSecretHash = await sha256Hex(clientSecret);
      
      const { error } = await supabase.from('oauth_clients').insert({
        client_id: clientId,
        client_secret_hash: clientSecretHash,
        partner_name: input.partner_name,
        redirect_uris: input.redirect_uris,
      });

      if (error) throw error;
      return { client_id: clientId, client_secret: clientSecret };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-clients'] });
      toast({ title: 'OAuth client created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Creation failed', description: error.message, variant: 'destructive' });
    }
  });

  const updateUrisMutation = useMutation({
    mutationFn: async (input: UpdateUrisData) => {
      const validationErrors = validateRedirectUris(input.redirectUris);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const { error } = await supabase
        .from('oauth_clients')
        .update({ redirect_uris: input.redirectUris })
        .eq('id', input.clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-clients'] });
      toast({ title: 'Redirect URIs updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('oauth_clients')
        .update({ is_active: false })
        .eq('id', clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-clients'] });
      toast({ title: 'Client deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete client', description: error.message, variant: 'destructive' });
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createClient: createMutation.mutateAsync,
    updateUris: updateUrisMutation.mutateAsync,
    deleteClient: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateUrisMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useIntegrationCount(clientId: string | null) {
  return useQuery({
    queryKey: ['integration-count', clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      
      const { count } = await supabase
        .from('partner_integrations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      
      return count || 0;
    },
    enabled: !!clientId,
  });
}

export function useAccessTokens(enabled: boolean) {
  return useQuery({
    queryKey: ['access-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oauth_access_tokens')
        .select(`
          id, access_token_hash, created_at, expires_at, revoked,
          refresh_token:oauth_refresh_tokens(
            partner_integration:partner_integrations(
              client_id, integration_identity,
              oauth_client:oauth_clients(partner_name)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled,
  });
}
export function useFormState<T>(initialState: T) {
  const [formData, setFormData] = useState<T>(initialState);
  
  const updateField = (field: keyof T, value: T[keyof T]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const resetForm = () => setFormData(initialState);
  
  return { formData, updateField, resetForm, setFormData };
}

export function useClipboard() {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch (error) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };
  
  return { copyToClipboard };
}