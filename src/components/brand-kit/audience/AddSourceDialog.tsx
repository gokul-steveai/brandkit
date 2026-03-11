import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LibrarySource } from './types';

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'information_source' | 'influencer' | 'technology';
  initialName?: string;
  onSourceAdded: (source: LibrarySource) => void;
}

interface AnalyzedData {
  description: string;
  favicon: string | null;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    youtube?: string;
    x?: string;
    facebook?: string;
    reddit?: string;
    skool?: string;
  };
}

const normalizeUrl = (url: string): string => {
  let normalized = url.trim();
  if (!normalized) return '';
  
  // Remove any existing protocol
  normalized = normalized.replace(/^(https?:\/\/)?/, '');
  
  // Add https://
  return `https://${normalized}`;
};

const getSourceTypeLabel = (type: 'information_source' | 'influencer' | 'technology') => {
  switch (type) {
    case 'information_source':
      return 'Information Source';
    case 'influencer':
      return 'Influencer';
    case 'technology':
      return 'Technology';
  }
};

export function AddSourceDialog({
  open,
  onOpenChange,
  sourceType,
  initialName = '',
  onSourceAdded,
}: AddSourceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const normalizedUrl = normalizeUrl(url);
      
      const { data, error } = await supabase.functions.invoke('analyze-source-url', {
        body: { url: normalizedUrl, sourceType }
      });

      if (error) throw error;

      setAnalyzedData(data);
      if (data.description && !description) {
        setDescription(data.description);
      }
      
      toast({ title: 'URL analyzed successfully' });
    } catch (error: any) {
      toast({
        title: 'Failed to analyze URL',
        description: error.message || 'Please try again or enter details manually',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    
    setIsSaving(true);
    try {
      const normalizedUrl = url.trim() ? normalizeUrl(url) : null;
      
      const insertData = {
        source_type: sourceType,
        name: name.trim(),
        url: normalizedUrl,
        description: description.trim() || analyzedData?.description || null,
        favicon_url: analyzedData?.favicon || null,
        instagram_url: analyzedData?.socialLinks?.instagram || null,
        tiktok_url: analyzedData?.socialLinks?.tiktok || null,
        linkedin_url: analyzedData?.socialLinks?.linkedin || null,
        skool_url: analyzedData?.socialLinks?.skool || null,
        youtube_url: analyzedData?.socialLinks?.youtube || null,
        reddit_url: analyzedData?.socialLinks?.reddit || null,
        x_url: analyzedData?.socialLinks?.x || null,
        facebook_url: analyzedData?.socialLinks?.facebook || null,
        is_library: false,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('library_target_audience_sources')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Source added successfully' });
      onSourceAdded(data as LibrarySource);
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Failed to add source',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setDescription('');
    setAnalyzedData(null);
    onOpenChange(false);
  };

  // Update name when initialName changes
  useState(() => {
    setName(initialName);
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New {getSourceTypeLabel(sourceType)}</DialogTitle>
          <DialogDescription>
            Add a URL to automatically extract information, or enter details manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={sourceType === 'influencer' ? 'e.g., John Smith' : 'e.g., TechCrunch'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAnalyze}
                disabled={!url.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Analyze'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              URL will be saved with https:// prefix
            </p>
          </div>

          {analyzedData && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {analyzedData.favicon && (
                    <img
                      src={analyzedData.favicon}
                      alt=""
                      className="w-5 h-5 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="font-medium text-sm">Analysis Complete</span>
                </div>
                {analyzedData.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {analyzedData.description}
                  </p>
                )}
                {Object.entries(analyzedData.socialLinks || {}).filter(([, v]) => v).length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <span>
                      Found {Object.entries(analyzedData.socialLinks || {}).filter(([, v]) => v).length} social links
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this source..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Source'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
