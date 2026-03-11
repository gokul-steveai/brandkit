import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Users, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { BrandKit, useBrandKits } from '@/hooks/useBrandKits';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useWebhookTrigger } from '@/hooks/useWebhookTrigger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/useToast';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { ShareBrandKitDialog } from '@/components/brand-kit/share';
import { cn } from '@/lib/utils';

interface BrandKitOverviewDropdownProps {
  brandKit: BrandKit;
}

interface OverviewFormData {
  name: string;
  description: string;
  website_url: string;
  tagline: string;
  brand_voice: string;
  summary: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_primary_color: string;
  text_secondary_color: string;
  link_color: string;
  color_scheme: string;
  heading_font: string;
  body_font: string;
  paragraph_font: string;
  logo_url: string;
  favicon_url: string;
  og_image_url: string;
  status: 'draft' | 'active' | 'archived';
}

function ColorInput({ 
  id, 
  label, 
  value, 
  onChange 
}: { 
  id: string; 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          placeholder="#000000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <Input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 p-1 cursor-pointer"
        />
      </div>
    </div>
  );
}

const formatUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

export function BrandKitOverviewDropdown({ brandKit }: BrandKitOverviewDropdownProps) {
  const { updateBrandKit, isUpdating } = useBrandKits();
  const [isOpen, setIsOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showExtractConfirm, setShowExtractConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const [formData, setFormData] = useState<OverviewFormData>({
    name: '',
    description: '',
    website_url: '',
    tagline: '',
    brand_voice: '',
    summary: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    background_color: '',
    text_primary_color: '',
    text_secondary_color: '',
    link_color: '',
    color_scheme: '',
    heading_font: '',
    body_font: '',
    paragraph_font: '',
    logo_url: '',
    favicon_url: '',
    og_image_url: '',
    status: 'draft'
  });

  useEffect(() => {
    if (brandKit) {
      setFormData({
        name: brandKit.name || '',
        description: brandKit.description || '',
        website_url: brandKit.website_url || '',
        tagline: brandKit.tagline || '',
        brand_voice: brandKit.brand_voice || '',
        summary: brandKit.summary || '',
        primary_color: brandKit.primary_color || '',
        secondary_color: brandKit.secondary_color || '',
        accent_color: brandKit.accent_color || '',
        background_color: brandKit.background_color || '',
        text_primary_color: brandKit.text_primary_color || '',
        text_secondary_color: brandKit.text_secondary_color || '',
        link_color: brandKit.link_color || '',
        color_scheme: brandKit.color_scheme || '',
        heading_font: brandKit.heading_font || '',
        body_font: brandKit.body_font || '',
        paragraph_font: brandKit.paragraph_font || '',
        logo_url: brandKit.logo_url || '',
        favicon_url: brandKit.favicon_url || '',
        og_image_url: brandKit.og_image_url || '',
        status: (brandKit.status as 'draft' | 'active' | 'archived') || 'draft'
      });
    }
  }, [brandKit]);

  const saveOverview = useCallback(async () => {
    if (!formData.name.trim()) {
      throw new Error('Name is required');
    }
    
    await updateBrandKit({
      id: brandKit.id,
      name: formData.name,
      description: formData.description || null,
      website_url: formData.website_url || null,
      tagline: formData.tagline || null,
      brand_voice: formData.brand_voice || null,
      summary: formData.summary || null,
      primary_color: formData.primary_color || null,
      secondary_color: formData.secondary_color || null,
      accent_color: formData.accent_color || null,
      background_color: formData.background_color || null,
      text_primary_color: formData.text_primary_color || null,
      text_secondary_color: formData.text_secondary_color || null,
      link_color: formData.link_color || null,
      color_scheme: formData.color_scheme || null,
      heading_font: formData.heading_font || null,
      body_font: formData.body_font || null,
      paragraph_font: formData.paragraph_font || null,
      logo_url: formData.logo_url || null,
      favicon_url: formData.favicon_url || null,
      og_image_url: formData.og_image_url || null,
      status: formData.status
    });
  }, [brandKit.id, formData, updateBrandKit]);

  const webhookTrigger = useWebhookTrigger(brandKit.id);

  const { autoSaveEnabled, hasUnsavedChanges, isSaving, manualSave } = useAutoSave({
    data: formData,
    onSave: saveOverview,
    onAfterSave: webhookTrigger,
    debounceMs: 1500,
    enabled: isOpen
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value as 'draft' | 'active' | 'archived' }));
  };

  const handleColorSchemeChange = (value: string) => {
    setFormData(prev => ({ ...prev, color_scheme: value }));
  };

  const handleExtractFromUrl = async () => {
    if (!formData.website_url.trim()) {
      toast({ title: 'Please enter a website URL first', variant: 'destructive' });
      return;
    }

    setShowExtractConfirm(false);
    setIsExtracting(true);

    try {
      const formattedUrl = formatUrl(formData.website_url);
      const result = await firecrawlApi.extractBrand(formattedUrl, brandKit.id);
      
      if (result.success && result.data) {
        const data = result.data;
        
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          description: data.description || prev.description,
          summary: data.summary || prev.summary,
          brand_voice: data.brand_voice || prev.brand_voice,
          primary_color: data.primary_color || prev.primary_color,
          secondary_color: data.secondary_color || prev.secondary_color,
          accent_color: data.accent_color || prev.accent_color,
          background_color: data.background_color || prev.background_color,
          text_primary_color: data.text_primary_color || prev.text_primary_color,
          text_secondary_color: data.text_secondary_color || prev.text_secondary_color,
          link_color: data.link_color || prev.link_color,
          color_scheme: data.color_scheme || prev.color_scheme,
          heading_font: data.heading_font || prev.heading_font,
          body_font: data.body_font || prev.body_font,
          paragraph_font: data.paragraph_font || prev.paragraph_font,
          logo_url: data.logo_url || prev.logo_url,
          favicon_url: data.favicon_url || prev.favicon_url,
          og_image_url: data.og_image_url || prev.og_image_url,
        }));

        // Build color_details from extracted colors
        const extractedColorDetails: Record<string, any> = {};
        const colorRoles = [
          { role: 'primary', key: 'primary_color' },
          { role: 'secondary', key: 'secondary_color' },
          { role: 'accent', key: 'accent_color' },
          { role: 'background', key: 'background_color' },
          { role: 'text_primary', key: 'text_primary_color' },
          { role: 'text_secondary', key: 'text_secondary_color' },
          { role: 'link', key: 'link_color' },
        ];
        for (const { role, key } of colorRoles) {
          const hex = data[key as keyof typeof data] as string | undefined;
          if (hex) {
            extractedColorDetails[role] = { light: { hex, description: '', useWhen: '' } };
          }
        }

        await updateBrandKit({
          id: brandKit.id,
          name: data.name || formData.name,
          description: data.description || undefined,
          summary: data.summary || undefined,
          brand_voice: data.brand_voice || undefined,
          primary_color: data.primary_color || undefined,
          secondary_color: data.secondary_color || undefined,
          accent_color: data.accent_color || undefined,
          background_color: data.background_color || undefined,
          text_primary_color: data.text_primary_color || undefined,
          text_secondary_color: data.text_secondary_color || undefined,
          link_color: data.link_color || undefined,
          color_scheme: data.color_scheme || undefined,
          color_details: Object.keys(extractedColorDetails).length > 0 ? extractedColorDetails : undefined,
          heading_font: data.heading_font || undefined,
          body_font: data.body_font || undefined,
          paragraph_font: data.paragraph_font || undefined,
          font_sizes: data.font_sizes as any || undefined,
          font_weights: data.font_weights as any || undefined,
          fonts_list: data.fonts_list as any || undefined,
          spacing: data.spacing as any || undefined,
          button_styles: data.button_styles as any || undefined,
          input_styles: data.input_styles as any || undefined,
          personality: data.personality as any || undefined,
          logo_url: data.logo_url || undefined,
          favicon_url: data.favicon_url || undefined,
          og_image_url: data.og_image_url || undefined,
          raw_scrape_path: data.raw_scrape_path || undefined
        });

        toast({ title: 'Brand extracted successfully!' });
      } else {
        const errorMessage = result.error || 'Failed to extract brand data';
        let title = 'Extraction failed';
        let description = errorMessage;

        if (errorMessage.toLowerCase().includes('insufficient tokens') || errorMessage.includes('402')) {
          description = 'You need more tokens to extract brand data. Upgrade your plan or purchase tokens.';
        } else if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
          description = 'Too many extraction requests. Please wait a few minutes and try again.';
        } else if (errorMessage.toLowerCase().includes('blocked') || errorMessage.includes('403')) {
          description = 'This website blocks automated access. Try a different URL or enter brand details manually.';
        }

        const urlHasWww = formattedUrl.includes('www.');
        const suggestion = urlHasWww
          ? 'Try removing "www." from the URL and retry.'
          : 'Try adding "www." to the URL (e.g., https://www.example.com) and retry.';
        description = `${description} — ${suggestion}`;

        toast({ title, description, variant: 'destructive', duration: 10000 });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const urlHasWww = formData.website_url.includes('www.');
      const suggestion = urlHasWww
        ? 'Try removing "www." from the URL and retry.'
        : 'Try adding "www." to the URL (e.g., https://www.example.com) and retry.';
      toast({ 
        title: 'Extraction failed', 
        description: `${errMsg} — ${suggestion}`,
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-3 h-10 px-4 max-w-xs"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-medium truncate">{brandKit.name}</span>
              <Progress value={brandKit.completion_percentage || 0} className="w-16 h-2" />
              <span className="text-xs text-muted-foreground">{brandKit.completion_percentage || 0}%</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[700px] max-h-[80vh] overflow-y-auto p-0" 
          align="center"
          sideOffset={8}
        >
          <div className="p-4 border-b border-border sticky top-0 bg-popover z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold">{brandKit.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={brandKit.completion_percentage || 0} className="w-24 h-2" />
                    <span className="text-sm text-muted-foreground">{brandKit.completion_percentage || 0}% complete</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Auto-save status indicator */}
                {autoSaveEnabled && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : hasUnsavedChanges ? (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        <span>Unsaved</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Saved</span>
                      </>
                    )}
                  </div>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Share
                </Button>
                {!autoSaveEnabled && (
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={() => manualSave()}
                    disabled={isUpdating || !hasUnsavedChanges}
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Basic Info */}
              <Card className="border-2 border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs">Brand Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tagline" className="text-xs">Tagline</Label>
                    <Input
                      id="tagline"
                      name="tagline"
                      placeholder="Your brand's tagline"
                      value={formData.tagline}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe this brand..."
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="website_url" className="text-xs">Website URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="website_url"
                        name="website_url"
                        type="url"
                        placeholder="https://example.com"
                        value={formData.website_url}
                        onChange={handleInputChange}
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!formData.website_url.trim()) {
                            toast({ title: 'Please enter a website URL first', variant: 'destructive' });
                            return;
                          }
                          setShowExtractConfirm(true);
                        }}
                        disabled={isExtracting || !formData.website_url.trim()}
                        className="h-8"
                      >
                        {isExtracting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="status" className="text-xs">Status</Label>
                    <Select value={formData.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Brand Colors - 2 column grid */}
              <Card className="border-2 border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Brand Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1">
                    <Label htmlFor="color_scheme" className="text-xs">Color Scheme</Label>
                    <Select value={formData.color_scheme} onValueChange={handleColorSchemeChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Primary */}
                    <div className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
                      <div
                        className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: formData.primary_color || '#E5E5E5' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Primary</p>
                        <Input
                          value={formData.primary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          placeholder="#000000"
                          className="h-6 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                    {/* Secondary */}
                    <div className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
                      <div
                        className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: formData.secondary_color || '#E5E5E5' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Secondary</p>
                        <Input
                          value={formData.secondary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          placeholder="#000000"
                          className="h-6 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                    {/* Accent */}
                    <div className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
                      <div
                        className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: formData.accent_color || '#E5E5E5' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Accent</p>
                        <Input
                          value={formData.accent_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                          placeholder="#000000"
                          className="h-6 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                    {/* Background */}
                    <div className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
                      <div
                        className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: formData.background_color || '#E5E5E5' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Background</p>
                        <Input
                          value={formData.background_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                          placeholder="#FFFFFF"
                          className="h-6 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card className="border-2 border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Typography</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1">
                    <Label htmlFor="heading_font" className="text-xs">Heading Font</Label>
                    <Input
                      id="heading_font"
                      name="heading_font"
                      placeholder="e.g., Inter, Roboto"
                      value={formData.heading_font}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="body_font" className="text-xs">Body Font</Label>
                    <Input
                      id="body_font"
                      name="body_font"
                      placeholder="e.g., Open Sans, Lato"
                      value={formData.body_font}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="paragraph_font" className="text-xs">Paragraph Font</Label>
                    <Input
                      id="paragraph_font"
                      name="paragraph_font"
                      placeholder="e.g., Roboto Mono"
                      value={formData.paragraph_font}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Logo & Assets */}
              <Card className="border-2 border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Logo & Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1">
                    <Label htmlFor="logo_url" className="text-xs">Logo URL</Label>
                    <Input
                      id="logo_url"
                      name="logo_url"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={formData.logo_url}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                  {formData.logo_url && (
                    <div className="p-2 bg-muted flex items-center justify-center">
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="max-h-12 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="favicon_url" className="text-xs">Favicon URL</Label>
                    <Input
                      id="favicon_url"
                      name="favicon_url"
                      type="url"
                      placeholder="https://example.com/favicon.ico"
                      value={formData.favicon_url}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="og_image_url" className="text-xs">OG Image URL</Label>
                    <Input
                      id="og_image_url"
                      name="og_image_url"
                      type="url"
                      placeholder="https://example.com/og-image.png"
                      value={formData.og_image_url}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary & Brand Voice - full width */}
            <Card className="border-2 border-border">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">AI Summary & Brand Voice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="summary" className="text-xs">Extracted Summary</Label>
                  <Textarea
                    id="summary"
                    name="summary"
                    placeholder="AI-generated summary of the brand..."
                    value={formData.summary}
                    onChange={handleInputChange}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="brand_voice" className="text-xs">Voice & Tone Guidelines</Label>
                  <Textarea
                    id="brand_voice"
                    name="brand_voice"
                    placeholder="Describe how this brand should communicate..."
                    value={formData.brand_voice}
                    onChange={handleInputChange}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showExtractConfirm} onOpenChange={setShowExtractConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extract Brand from Website?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt to extract branding information from the website and may overwrite existing values. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExtractFromUrl}>
              Extract & Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareBrandKitDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        brandKitId={brandKit.id}
        brandKitName={brandKit.name}
        ownerId={brandKit.user_id}
      />
    </>
  );
}
