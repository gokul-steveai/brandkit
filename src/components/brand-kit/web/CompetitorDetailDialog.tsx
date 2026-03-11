import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, ExternalLink, Palette, Type, Layout, Users,
  Facebook, Instagram, Twitter, Linkedin, Youtube, Save, Plus, X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import type { Json } from '@/integrations/supabase/types';

const SOCIAL_PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

interface CompetitorData {
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
}

interface CompetitorDetailDialogProps {
  competitor: CompetitorData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
}

export function CompetitorDetailDialog({ competitor, open, onOpenChange, brandKitId }: CompetitorDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('#000000');
  const [valueProps, setValueProps] = useState<string[]>([]);
  const [newValueProp, setNewValueProp] = useState('');
  const [socialProfiles, setSocialProfiles] = useState<{ platform: string; url: string }[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (competitor) {
      setName(competitor.name || '');
      setDescription(competitor.description || '');
      setTagline(competitor.tagline || '');
      setColors([...competitor.brand_colors]);
      setValueProps([...competitor.value_propositions]);
      setSocialProfiles([...competitor.social_profiles]);
      setIsDirty(false);
    }
  }, [competitor]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!competitor) return;
      const { error } = await supabase
        .from('brand_kit_competitors')
        .update({
          name: name || null,
          description: description || null,
          tagline: tagline || null,
          brand_colors: colors as unknown as Json,
          value_propositions: valueProps as unknown as Json,
          social_profiles: socialProfiles as unknown as Json,
        })
        .eq('id', competitor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-competitors', brandKitId] });
      toast({ title: 'Competitor updated' });
      setIsDirty(false);
    },
    onError: () => toast({ title: 'Failed to save changes', variant: 'destructive' }),
  });

  const markDirty = () => setIsDirty(true);

  const addColor = () => {
    if (newColor && !colors.includes(newColor)) {
      setColors([...colors, newColor]);
      markDirty();
    }
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
    markDirty();
  };

  const addValueProp = () => {
    if (newValueProp.trim()) {
      setValueProps([...valueProps, newValueProp.trim()]);
      setNewValueProp('');
      markDirty();
    }
  };

  const removeValueProp = (index: number) => {
    setValueProps(valueProps.filter((_, i) => i !== index));
    markDirty();
  };

  const addSocialProfile = () => {
    setSocialProfiles([...socialProfiles, { platform: '', url: '' }]);
    markDirty();
  };

  const updateSocialProfile = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialProfiles];
    updated[index] = { ...updated[index], [field]: value };
    setSocialProfiles(updated);
    markDirty();
  };

  const removeSocialProfile = (index: number) => {
    setSocialProfiles(socialProfiles.filter((_, i) => i !== index));
    markDirty();
  };

  if (!competitor) return null;

  const typography = competitor.typography as Record<string, unknown> | null;
  const buttonStyles = competitor.button_styles as Record<string, unknown> | null;
  const spacingData = competitor.spacing as Record<string, unknown> | null;
  const personality = competitor.brand_personality as Record<string, unknown> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {competitor.logo_url ? (
              <img src={competitor.logo_url} alt="" className="h-10 w-10 rounded object-contain bg-muted p-1" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <DialogTitle>{competitor.name || new URL(competitor.url).hostname}</DialogTitle>
              <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> {new URL(competitor.url).hostname}
              </a>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} placeholder="Brand name" />
              </div>
              <div>
                <Label>Tagline</Label>
                <Input value={tagline} onChange={(e) => { setTagline(e.target.value); markDirty(); }} placeholder="Brand tagline" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} placeholder="Brand description" rows={3} />
              </div>
              {valueProps.length > 0 && (
                <div>
                  <Label>Value Propositions</Label>
                  <div className="space-y-2 mt-1">
                    {valueProps.map((vp, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm flex-1 bg-muted rounded px-2 py-1">{vp}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeValueProp(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input value={newValueProp} onChange={(e) => setNewValueProp(e.target.value)} placeholder="Add value proposition" onKeyDown={(e) => e.key === 'Enter' && addValueProp()} />
                <Button variant="outline" size="icon" onClick={addValueProp}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </TabsContent>

          {/* IDENTITY TAB */}
          <TabsContent value="identity" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> Brand Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {colors.map((color, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger>
                        <div className="relative group">
                          <div className="h-8 w-8 rounded-md border border-border" style={{ backgroundColor: color }} />
                          <button onClick={() => removeColor(i)} className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center text-[10px]">×</button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{color}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-28" />
                  <Button variant="outline" size="sm" onClick={addColor}>Add</Button>
                </div>
                {competitor.color_scheme && (
                  <div className="text-sm text-muted-foreground">Color scheme: <Badge variant="outline">{competitor.color_scheme}</Badge></div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Type className="h-4 w-4" /> Typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {typography ? (
                  <>
                    {(typography.fontFamilies as Record<string, string> | undefined) && (
                      <div className="space-y-1">
                        {Object.entries(typography.fontFamilies as Record<string, string>).map(([role, family]) => (
                          <div key={role} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{role}</span>
                            <span className="font-medium">{family}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(typography.fontSizes as Record<string, string> | undefined) && (
                      <div className="pt-2 border-t border-border space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Font Sizes</p>
                        {Object.entries(typography.fontSizes as Record<string, string>).map(([tag, size]) => (
                          <div key={tag} className="flex justify-between text-sm">
                            <code className="text-xs bg-muted px-1 rounded">{tag}</code>
                            <span>{size}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No typography data scraped</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DESIGN TAB */}
          <TabsContent value="design" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Layout className="h-4 w-4" /> Button Styles</CardTitle>
              </CardHeader>
              <CardContent>
                {buttonStyles ? (
                  <div className="space-y-3">
                    {Object.entries(buttonStyles).map(([key, style]) => {
                      const s = style as Record<string, string>;
                      if (!s?.background) return null;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="rounded-md px-4 py-1.5 text-xs font-medium" style={{ backgroundColor: s.background, color: s.textColor, borderRadius: s.borderRadius }}>
                            {key.replace('button', '')}
                          </div>
                          <div className="text-xs text-muted-foreground space-x-2">
                            <span>{s.background}</span>
                            <span>radius: {s.borderRadius}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No button style data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Spacing & Layout</CardTitle>
              </CardHeader>
              <CardContent>
                {spacingData ? (
                  <div className="space-y-1">
                    {Object.entries(spacingData).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No spacing data</p>
                )}
              </CardContent>
            </Card>

            {competitor.design_framework && (
              <div className="text-sm">Design framework: <Badge variant="outline">{competitor.design_framework}</Badge></div>
            )}
          </TabsContent>

          {/* SOCIAL TAB */}
          <TabsContent value="social" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Social Profiles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {socialProfiles.map((sp, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={sp.platform} onChange={(e) => updateSocialProfile(i, 'platform', e.target.value)} placeholder="Platform" className="w-28" />
                    <Input value={sp.url} onChange={(e) => updateSocialProfile(i, 'url', e.target.value)} placeholder="https://..." className="flex-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSocialProfile(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSocialProfile}><Plus className="h-4 w-4 mr-1" /> Add Profile</Button>
              </CardContent>
            </Card>

            {personality && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Brand Personality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Object.entries(personality).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{key}</span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {isDirty && (
          <div className="flex justify-end pt-2 border-t border-border">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
