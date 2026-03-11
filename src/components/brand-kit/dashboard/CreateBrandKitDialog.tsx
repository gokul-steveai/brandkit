import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/useToast';
import { useBrandKits } from '@/hooks/useBrandKits';
import { firecrawlApi, type SocialUrl } from '@/lib/api/firecrawl';
import { supabase } from '@/integrations/supabase/client';

const formatUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

interface CreateBrandKitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBrandKitDialog({ open, onOpenChange }: CreateBrandKitDialogProps) {
  const navigate = useNavigate();
  const { createBrandKit, updateBrandKit, isCreating } = useBrandKits();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [createdBrandKitId, setCreatedBrandKitId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website_url: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateFromScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      const brandKit = await createBrandKit({
        name: formData.name,
        description: formData.description
      });
      onOpenChange(false);
      navigate(`/brand-kits/${brandKit.id}/edit`);
    } catch (error) {
      // Error handled in hook
    }
  };

  // Create placeholder social profile records for detected social URLs
  const createSocialPlaceholders = async (
    brandKitId: string,
    socialUrls: SocialUrl[]
  ) => {
    if (!socialUrls || socialUrls.length === 0) return;

    const placeholders = socialUrls.map((social) => ({
      brand_kit_id: brandKitId,
      platform: social.platform,
      profile_type: 'company' as const,
      profile_url: social.url,
      status: 'pending' as const,
    }));

    const { error } = await supabase
      .from('social_profiles')
      .insert(placeholders);

    if (error) {
      console.error('Failed to create social profile placeholders:', error);
    } else {
      console.log(`Created ${placeholders.length} social profile placeholders`);
    }
  };

  const performExtraction = async (brandKitId: string, url: string) => {
    const result = await firecrawlApi.extractBrand(url, brandKitId);
    
    if (result.success && result.data) {
      const data = result.data;
      
      // Update brand kit with extracted data including social URLs and color_details
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
        id: brandKitId,
        name: data.name || formData.name || 'Untitled Brand Kit',
        description: data.description || undefined,
        summary: data.summary || undefined,
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
        raw_scrape_path: data.raw_scrape_path || undefined,
        brand_kit_social_urls: data.social_urls as any || undefined,
      });

      // Create placeholder social profile records if social URLs were found
      if (data.social_urls && data.social_urls.length > 0) {
        await createSocialPlaceholders(brandKitId, data.social_urls);
      }
      
      return { success: true, socialUrlsFound: data.social_urls?.length || 0, targetAudience: data.personality?.targetAudience };
    }
    
    // Provide more specific error messages based on error type
    const errorMessage = result.error || 'Failed to extract brand data';
    if (errorMessage.toLowerCase().includes('insufficient tokens') || errorMessage.includes('402')) {
      return { success: false, error: 'You need more tokens to extract brand data. Upgrade your plan or purchase tokens.' };
    }
    if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
      return { success: false, error: 'Too many extraction requests. Please wait a few minutes and try again.' };
    }
    if (errorMessage.toLowerCase().includes('blocked') || errorMessage.includes('403')) {
      return { success: false, error: 'This website blocks automated access. Try a different URL or enter brand details manually.' };
    }
    return { success: false, error: errorMessage };
  };

  const handleExtractFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.website_url.trim()) {
      toast({ title: 'URL is required', variant: 'destructive' });
      return;
    }

    const formattedUrl = formatUrl(formData.website_url);
    setExtractionError(null);
    setIsExtracting(true);

    try {
      // First create the brand kit
      const brandKit = await createBrandKit({
        name: formData.name || 'Untitled Brand Kit',
        website_url: formattedUrl
      });

      setCreatedBrandKitId(brandKit.id);

      // Then extract branding data
      const result = await performExtraction(brandKit.id, formattedUrl);
      
      if (result.success) {
        const socialMsg = result.socialUrlsFound 
          ? ` Found ${result.socialUrlsFound} social profile(s).`
          : '';
        toast({ title: `Brand extracted successfully!${socialMsg}` });

        // Auto-create target audience persona if detected
        if (result.targetAudience && typeof result.targetAudience === 'string') {
          try {
            const words = result.targetAudience.split(/\s+/).slice(0, 3);
            const personaName = words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            await supabase.from('brand_kit_target_audience').insert({
              brand_kit_id: brandKit.id,
              persona_name: personaName,
              persona_title: result.targetAudience,
              persona_type: 'b2c',
              is_primary: true,
            });
            toast({ title: 'Target audience detected', description: `Created "${personaName}" persona from website data.` });
          } catch (e) {
            console.error('Failed to create target audience:', e);
          }
        }

        onOpenChange(false);
        navigate(`/brand-kits/${brandKit.id}/edit`);
      } else {
        const urlHasWww = formattedUrl.includes('www.');
        const suggestion = urlHasWww
          ? 'Extraction failed. Try removing "www." from the URL and retry.'
          : 'Our extraction service could not reach this URL. Try adding "www." (e.g., https://www.example.com) and retry.';
        setExtractionError(result.error ? `${result.error} — ${suggestion}` : suggestion);
      }
    } catch (error) {
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract brand');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRetryExtraction = async () => {
    if (!createdBrandKitId || !formData.website_url) return;

    const formattedUrl = formatUrl(formData.website_url);
    setExtractionError(null);
    setIsExtracting(true);

    try {
      const result = await performExtraction(createdBrandKitId, formattedUrl);
      
      if (result.success) {
        const socialMsg = result.socialUrlsFound 
          ? ` Found ${result.socialUrlsFound} social profile(s).`
          : '';
        toast({ title: `Brand extracted successfully!${socialMsg}` });
        onOpenChange(false);
        navigate(`/brand-kits/${createdBrandKitId}/edit`);
      } else {
        const urlHasWww = formattedUrl.includes('www.');
        const suggestion = urlHasWww
          ? 'Extraction failed. Try removing "www." from the URL and retry.'
          : 'Our extraction service could not reach this URL. Try adding "www." (e.g., https://www.example.com) and retry.';
        setExtractionError(result.error ? `${result.error} — ${suggestion}` : suggestion);
      }
    } catch (error) {
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract brand');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleContinueWithoutExtraction = () => {
    if (createdBrandKitId) {
      onOpenChange(false);
      navigate(`/brand-kits/${createdBrandKitId}/edit`);
    }
  };

  const isLoading = isCreating || isExtracting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Brand Kit</DialogTitle>
          <DialogDescription>
            Start from scratch or extract branding from a website
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scratch" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scratch">From Scratch</TabsTrigger>
            <TabsTrigger value="extract" className="flex items-center gap-1.5">Extract from URL <Sparkles className="h-3.5 w-3.5 text-ai-sparkle" /></TabsTrigger>
          </TabsList>

          <TabsContent value="scratch" className="space-y-4 mt-4">
            <form onSubmit={handleCreateFromScratch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Brand"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="A brief description of this brand..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Brand Kit'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="extract" className="space-y-4 mt-4">
            <form onSubmit={handleExtractFromUrl} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  name="website_url"
                  type="text"
                  placeholder="brandkitos.com"
                  value={formData.website_url}
                  onChange={handleInputChange}
                  disabled={isExtracting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extract-name">Brand Name (optional)</Label>
                <Input
                  id="extract-name"
                  name="name"
                  placeholder="Will be extracted if not provided"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isExtracting}
                />
              </div>

              {extractionError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    {extractionError}
                  </AlertDescription>
                </Alert>
              )}

              {extractionError ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleRetryExtraction}
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Retry
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleContinueWithoutExtraction}
                    disabled={isExtracting}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue
                  </Button>
                </div>
              ) : (
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting Brand...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 text-ai-sparkle" />
                      Extract & Create
                    </>
                  )}
                </Button>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
