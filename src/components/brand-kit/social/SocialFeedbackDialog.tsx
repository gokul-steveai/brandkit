import { useState } from 'react';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SocialFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId?: string;
}

export function SocialFeedbackDialog({
  open,
  onOpenChange,
  brandKitId,
}: SocialFeedbackDialogProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!description.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user.id,
        brand_kit_id: brandKitId || null,
        feedback_type: 'additional_social',
        description: description.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your suggestion! We\'ll review it soon.',
      });
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Request a Social Connector
          </DialogTitle>
          <DialogDescription>
            Let us know which social media platform you'd like us to add support for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="platform-request">
              Which platform would you like to connect?
            </Label>
            <Textarea
              id="platform-request"
              placeholder="e.g., Twitter/X, Pinterest, Threads, Snapchat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-2 min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
