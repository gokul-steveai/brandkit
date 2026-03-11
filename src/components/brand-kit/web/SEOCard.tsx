import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Sparkles, X, Loader2, Plus, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { useUpgradePrompt } from '@/components/subscription/UpgradeModal';

interface SEOCardProps {
  brandKitId: string;
}

export function SEOCard({ brandKitId }: SEOCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAccessFeature } = useBrandKitSubscription(brandKitId);
  const { promptUpgrade, UpgradePromptModal } = useUpgradePrompt();

  const canUseSuggestions = canAccessFeature('seoSuggestions');

  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState('');

  const { data: seoData, isLoading } = useQuery({
    queryKey: ['brand-kit-seo', brandKitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_kit_seo')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const keywords: string[] = Array.isArray(seoData?.keywords) ? seoData.keywords as string[] : [];
  const tags: string[] = Array.isArray(seoData?.tags) ? seoData.tags as string[] : [];
  const suggestedKeywords: string[] = Array.isArray(seoData?.suggested_keywords) ? seoData.suggested_keywords as string[] : [];

  const upsertMutation = useMutation({
    mutationFn: async (updates: { keywords?: string[]; tags?: string[]; suggested_keywords?: string[] }) => {
      if (seoData?.id) {
        const { error } = await supabase
          .from('brand_kit_seo')
          .update(updates as any)
          .eq('id', seoData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brand_kit_seo')
          .insert({ brand_kit_id: brandKitId, ...updates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brand-kit-seo', brandKitId] }),
    onError: () => toast({ title: 'Failed to save SEO data', variant: 'destructive' }),
  });

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const updated = [...keywords, newKeyword.trim()];
    upsertMutation.mutate({ keywords: updated as any });
    setNewKeyword('');
  };

  const removeKeyword = (index: number) => {
    upsertMutation.mutate({ keywords: keywords.filter((_, i) => i !== index) as any });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const updated = [...tags, newTag.trim()];
    upsertMutation.mutate({ tags: updated as any });
    setNewTag('');
  };

  const removeTag = (index: number) => {
    upsertMutation.mutate({ tags: tags.filter((_, i) => i !== index) as any });
  };

  const acceptSuggestion = (keyword: string) => {
    const updatedKeywords = [...keywords, keyword];
    const updatedSuggested = suggestedKeywords.filter(k => k !== keyword);
    upsertMutation.mutate({ keywords: updatedKeywords as any, suggested_keywords: updatedSuggested as any });
  };

  const dismissSuggestion = (keyword: string) => {
    const updatedSuggested = suggestedKeywords.filter(k => k !== keyword);
    upsertMutation.mutate({ suggested_keywords: updatedSuggested as any });
  };

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-seo-keywords', {
        body: { brandKitId },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to generate suggestions');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-seo', brandKitId] });
      toast({ title: 'SEO suggestions generated' });
    },
    onError: (err: any) => toast({ title: 'Failed to suggest keywords', description: err.message, variant: 'destructive' }),
  });

  const handleSuggest = () => {
    if (!canUseSuggestions) {
      promptUpgrade({ reason: 'feature', feature: 'seoSuggestions' });
      return;
    }
    suggestMutation.mutate();
  };

  return (
    <>
      <UpgradePromptModal />
      <div className="space-y-6">
        {/* Keywords */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Keywords
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleSuggest} disabled={suggestMutation.isPending}>
                {suggestMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />Suggest Keywords</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button size="sm" onClick={addKeyword} disabled={!newKeyword.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {kw}
                    <button onClick={() => removeKeyword(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* AI Suggestions */}
            {suggestedKeywords.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">AI Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {kw}
                      <button onClick={() => acceptSuggestion(kw)} className="ml-1 hover:text-chart-2">
                        <Check className="h-3 w-3" />
                      </button>
                      <button onClick={() => dismissSuggestion(kw)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button size="sm" onClick={addTag} disabled={!newTag.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
