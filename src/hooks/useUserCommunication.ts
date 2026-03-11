import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { buildSupportTicketFilePath, STORAGE_CONFIG } from '@/lib/storage/constants';

export type CommunicationType = 'Support Ticket' | 'Feedback';
export type SupportType = 'Bug Report' | 'Feature Request' | 'Account Issue' | 'Billing Question' | 'Technical Help' | 'Other';

interface CreateCommunicationParams {
  communicationType: CommunicationType;
  brandKitId?: string | null;
  supportType?: SupportType | null;
  subject: string;
  details: string;
  screenshot?: File | null;
}

export function useUserCommunication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createCommunication = useMutation({
    mutationFn: async (params: CreateCommunicationParams) => {
      if (!user) throw new Error('User not authenticated');

      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (params.screenshot) {
        const fileName = `${Date.now()}-${params.screenshot.name}`;
        const filePath = buildSupportTicketFilePath(user.id, fileName);

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_CONFIG.BUCKET)
          .upload(filePath, params.screenshot);

        if (uploadError) {
          throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_CONFIG.BUCKET)
          .getPublicUrl(filePath);

        screenshotUrl = urlData.publicUrl;
      }

      // Insert communication record
      const { data, error } = await supabase
        .from('user_communication')
        .insert({
          user_id: user.id,
          brand_kit_id: params.brandKitId || null,
          communication_type: params.communicationType,
          support_type: params.supportType || null,
          subject: params.subject,
          details: params.details,
          screenshot_url: screenshotUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-communications'] });
      const type = variables.communicationType === 'Support Ticket' ? 'Support ticket' : 'Feedback';
      toast({
        title: `${type} submitted`,
        description: `Thank you! We'll review your ${type.toLowerCase()} shortly.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    createCommunication,
  };
}
