import { useState } from 'react';
import { Users, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';

interface TargetAudienceSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  targetAudienceText: string;
}

export function TargetAudienceSuggestionDialog({
  open,
  onOpenChange,
  brandKitId,
  targetAudienceText,
}: TargetAudienceSuggestionDialogProps) {
  const [isCreating, setIsCreating] = useState(false);

  const derivePersonaName = (text: string): string => {
    // Capitalize first letter of each word, take first 3 words max
    const words = text.split(/\s+/).slice(0, 3);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // Check if any audiences already exist
      const { count } = await supabase
        .from('brand_kit_target_audience')
        .select('id', { count: 'exact', head: true })
        .eq('brand_kit_id', brandKitId);

      const isPrimary = (count ?? 0) === 0;

      const { error } = await supabase
        .from('brand_kit_target_audience')
        .insert({
          brand_kit_id: brandKitId,
          persona_name: derivePersonaName(targetAudienceText),
          persona_title: targetAudienceText,
          persona_type: 'b2c',
          is_primary: isPrimary,
        });

      if (error) throw error;

      toast({ title: 'Target audience created', description: 'You can refine the details in the Audience section.' });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create target audience:', error);
      toast({ title: 'Failed to create audience', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Target Audience Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>We detected a potential target audience from your website:</p>
            <p className="font-medium text-foreground bg-muted rounded-md px-3 py-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ai-sparkle shrink-0" />
              {targetAudienceText}
            </p>
            <p>Would you like us to create a target audience persona from this? You can refine the details later.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            No thanks
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Yes, create persona'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
