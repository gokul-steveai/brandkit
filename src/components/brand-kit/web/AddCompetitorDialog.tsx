import { useState } from 'react';
import { Loader2, Globe, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  onCompetitorAdded: () => void;
}

export function AddCompetitorDialog({ open, onOpenChange, brandKitId, onCompetitorAdded }: AddCompetitorDialogProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      const { data, error: fnError } = await supabase.functions.invoke('scrape-competitor', {
        body: { url: normalizedUrl, brandKitId },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to scrape competitor');

      toast({ title: 'Competitor added', description: data.data?.name || 'Successfully scraped competitor website' });
      onCompetitorAdded();
      setUrl('');
      setError(null);
      onOpenChange(false);
    } catch (err: any) {
      const urlHasWww = url.includes('www.');
      const suggestion = urlHasWww
        ? 'Try removing "www." from the URL and retry.'
        : 'Try adding "www." (e.g., https://www.example.com) and retry.';
      setError(`${err.message} — ${suggestion}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Add Competitor
          </DialogTitle>
          <DialogDescription>
            Enter a competitor's website URL. We'll scrape their site to capture branding, content, and social profiles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="https://competitor.com"
            required
            disabled={isLoading}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !url.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />
                  Add Competitor
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
