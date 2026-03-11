import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Trash2, ExternalLink, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { useUpgradePrompt } from '@/components/subscription/UpgradeModal';
import { PREMIUM_SOFT_CAP } from '@/lib/subscription/constants';
import { AddNewCard } from '@/components/brand-kit/shared';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import { CompetitorDetailDialog } from './CompetitorDetailDialog';

const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  twitter: 'X',
  linkedin: 'LI',
  youtube: 'YT',
  tiktok: 'TT',
  reddit: 'RD',
};

interface Competitor {
  id: string;
  brand_kit_id: string;
  url: string;
  name: string | null;
  description: string | null;
  logo_url: string | null;
  brand_colors: string[];
  fonts: string[];
  tagline: string | null;
  value_propositions: string[];
  social_profiles: { platform: string; url: string }[];
  color_scheme: string | null;
  typography: Record<string, unknown> | null;
  button_styles: Record<string, unknown> | null;
  spacing: Record<string, unknown> | null;
  brand_personality: Record<string, unknown> | null;
  design_framework: string | null;
  raw_scrape_data: Record<string, unknown> | null;
  created_at: string;
}

interface CompetitorCardProps {
  brandKitId: string;
}

export function CompetitorCard({ brandKitId }: CompetitorCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ownerTier, getLimit, canCreateMore, canAccessFeature } = useBrandKitSubscription(brandKitId);
  const { promptUpgrade, UpgradePromptModal } = useUpgradePrompt();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);

  const hasAccess = canAccessFeature('competitors');
  const competitorLimit = getLimit('competitors');

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['brand-kit-competitors', brandKitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_kit_competitors')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        brand_colors: Array.isArray(c.brand_colors) ? c.brand_colors as string[] : [],
        fonts: Array.isArray(c.fonts) ? c.fonts as string[] : [],
        value_propositions: Array.isArray(c.value_propositions) ? c.value_propositions as string[] : [],
        social_profiles: Array.isArray(c.social_profiles) ? c.social_profiles as { platform: string; url: string }[] : [],
        typography: c.typography as Record<string, unknown> | null,
        button_styles: c.button_styles as Record<string, unknown> | null,
        spacing: c.spacing as Record<string, unknown> | null,
        brand_personality: c.brand_personality as Record<string, unknown> | null,
        raw_scrape_data: c.raw_scrape_data as Record<string, unknown> | null,
      })) as Competitor[];
    },
    enabled: hasAccess,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_kit_competitors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-competitors', brandKitId] });
      toast({ title: 'Competitor removed' });
    },
    onError: () => toast({ title: 'Failed to remove competitor', variant: 'destructive' }),
  });

  const handleAdd = () => {
    if (!hasAccess) {
      promptUpgrade({ reason: 'feature', feature: 'competitors' });
      return;
    }
    const canAdd = canCreateMore('competitors', competitors.length);
    if (!canAdd) {
      if (ownerTier === 'premium' && competitors.length >= PREMIUM_SOFT_CAP) {
        toast({ title: 'Soft cap reached', description: 'File a support ticket to request more competitors.' });
      } else {
        promptUpgrade({ reason: 'limit', limitType: 'Competitors' });
      }
      return;
    }
    setIsAddDialogOpen(true);
  };

  if (!hasAccess) {
    return (
      <>
        <UpgradePromptModal />
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Competitor Analysis</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Upgrade to Base or Premium to track and analyze your competitors.
            </p>
            <Button onClick={() => promptUpgrade({ reason: 'feature', feature: 'competitors' })}>
              Upgrade to Unlock
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <UpgradePromptModal />
      <AddCompetitorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        brandKitId={brandKitId}
        onCompetitorAdded={() => queryClient.invalidateQueries({ queryKey: ['brand-kit-competitors', brandKitId] })}
      />
      <CompetitorDetailDialog
        competitor={selectedCompetitor}
        open={!!selectedCompetitor}
        onOpenChange={(open) => { if (!open) setSelectedCompetitor(null); }}
        brandKitId={brandKitId}
      />

      <div className="space-y-4">
        {competitorLimit !== -1 && competitors.length > 0 && (
          <div className="flex justify-end">
            <Badge variant="outline">{competitors.length} / {competitorLimit} used</Badge>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitors.map((comp) => (
            <Card
              key={comp.id}
              className="border-2 border-border cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setSelectedCompetitor(comp)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {comp.logo_url ? (
                      <img src={comp.logo_url} alt={comp.name || ''} className="h-10 w-10 rounded object-contain bg-muted p-1" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{comp.name || new URL(comp.url).hostname}</CardTitle>
                      {comp.tagline && <p className="text-xs text-muted-foreground line-clamp-1">{comp.tagline}</p>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(comp.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {comp.description && <p className="text-sm text-muted-foreground line-clamp-2">{comp.description}</p>}

                {comp.brand_colors.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex gap-1">
                      {comp.brand_colors.slice(0, 6).map((color, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger>
                            <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color }} />
                          </TooltipTrigger>
                          <TooltipContent>{color}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {comp.social_profiles.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {comp.social_profiles.map((sp, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {SOCIAL_ICONS[sp.platform] || sp.platform.slice(0, 2).toUpperCase()}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{sp.platform}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}

                <a
                  href={comp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  {new URL(comp.url).hostname}
                </a>
              </CardContent>
            </Card>
          ))}

          <AddNewCard
            title="Add Competitor"
            description="Scrape a competitor's website"
            onClick={handleAdd}
            disabled={!canCreateMore('competitors', competitors.length)}
            disabledReason={competitorLimit !== -1 ? `Upgrade to add more than ${competitorLimit} competitors` : undefined}
          />
        </div>
      </div>
    </>
  );
}
