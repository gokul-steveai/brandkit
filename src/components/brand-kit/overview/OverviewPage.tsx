import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, Check, X, Pencil } from 'lucide-react';
import { BrandKit, useBrandKits } from '@/hooks/useBrandKits';
import { useBrandKitRole } from '@/hooks/useBrandKitMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { PersonaOverviewCard } from '@/components/brand-kit/personas';
import { BasicInfoCard } from './BasicInfoCard';
import { BrandColorsCard } from './BrandColorsCard';
import { UIColorsCard } from './UIColorsCard';
import { TypographyCard } from './TypographyCard';
import { LogoAssetsCard } from './LogoAssetsCard';
import { AISummaryCard } from './AISummaryCard';
import { ColorMetadata, ColorDetails } from './types';
import { TargetAudienceSuggestionDialog } from './TargetAudienceSuggestionDialog';

interface IndustryClassification {
  id: string;
  name: string;
  level: 'industry' | 'subindustry' | 'sector';
  parent_id: string | null;
}

const formatUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

export function OverviewPage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const { updateBrandKit, isUpdating } = useBrandKits();
  const { data: userRole } = useBrandKitRole(brandKit.id);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showExtractConfirm, setShowExtractConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showAudienceSuggestion, setShowAudienceSuggestion] = useState(false);
  const [detectedAudience, setDetectedAudience] = useState('');

  // Industry classification state
  const [classifications, setClassifications] = useState<IndustryClassification[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedSubindustry, setSelectedSubindustry] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    if (brandKit) {
      setEditedName(brandKit.name);
    }
  }, [brandKit]);

  // Load industry classifications and saved classification
  useEffect(() => {
    const loadClassifications = async () => {
      const { data: classificationsData } = await supabase
        .from('industry_classifications')
        .select('*')
        .order('name');
      
      if (classificationsData) {
        setClassifications(classificationsData as IndustryClassification[]);
      }

      // Load current classification from brand_kit_core
      const { data: coreData } = await supabase
        .from('brand_kit_core')
        .select('industry_classification_id')
        .eq('brand_kit_id', brandKit.id)
        .maybeSingle();

      if (coreData?.industry_classification_id && classificationsData) {
        const savedClassification = classificationsData.find(
          c => c.id === coreData.industry_classification_id
        );
        
        if (savedClassification) {
          if (savedClassification.level === 'sector') {
            setSelectedSector(savedClassification.id);
            const subindustry = classificationsData.find(
              c => c.id === savedClassification.parent_id
            );
            if (subindustry) {
              setSelectedSubindustry(subindustry.id);
              const industry = classificationsData.find(
                c => c.id === subindustry.parent_id
              );
              if (industry) {
                setSelectedIndustry(industry.id);
              }
            }
          } else if (savedClassification.level === 'subindustry') {
            setSelectedSubindustry(savedClassification.id);
            const industry = classificationsData.find(
              c => c.id === savedClassification.parent_id
            );
            if (industry) {
              setSelectedIndustry(industry.id);
            }
          } else if (savedClassification.level === 'industry') {
            setSelectedIndustry(savedClassification.id);
          }
        }
      }
    };

    loadClassifications();
  }, [brandKit.id]);

  // Filter classifications by level
  const industries = classifications.filter(c => c.level === 'industry');
  const subindustries = classifications.filter(
    c => c.level === 'subindustry' && c.parent_id === selectedIndustry
  );
  const sectors = classifications.filter(
    c => c.level === 'sector' && c.parent_id === selectedSubindustry
  );

  const handleIndustryChange = async (value: string) => {
    setSelectedIndustry(value || null);
    setSelectedSubindustry(null);
    setSelectedSector(null);
    await saveClassification(value || null);
  };

  const handleSubindustryChange = async (value: string) => {
    setSelectedSubindustry(value || null);
    setSelectedSector(null);
    await saveClassification(value || selectedIndustry);
  };

  const handleSectorChange = async (value: string) => {
    setSelectedSector(value || null);
    await saveClassification(value || selectedSubindustry || selectedIndustry);
  };

  const saveClassification = async (classificationId: string | null) => {
    try {
      // Check if brand_kit_core exists
      const { data: existing, error: fetchError } = await supabase
        .from('brand_kit_core')
        .select('id')
        .eq('brand_kit_id', brandKit.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('brand_kit_core')
          .update({ industry_classification_id: classificationId })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('brand_kit_core')
          .insert({ 
            brand_kit_id: brandKit.id, 
            industry_classification_id: classificationId 
          });
        if (insertError) throw insertError;
      }

      toast({ title: 'Industry classification saved' });
    } catch (error) {
      console.error('Failed to save classification:', error);
      toast({ title: 'Failed to save industry classification', variant: 'destructive' });
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    
    try {
      await updateBrandKit({ id: brandKit.id, name: editedName.trim() });
      setIsEditingName(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCancelNameEdit = () => {
    setEditedName(brandKit?.name || '');
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelNameEdit();
    }
  };

  const [formData, setFormData] = useState({
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
    font_sizes: {} as Record<string, string>,
    font_weights: {} as Record<string, number>,
    logo_url: '',
    favicon_url: '',
    og_image_url: '',
    custom_1_color: '',
    custom_1_name: '',
    custom_2_color: '',
    custom_2_name: '',
    custom_3_color: '',
    custom_3_name: '',
    custom_4_color: '',
    custom_4_name: '',
    status: 'draft' as 'draft' | 'active' | 'archived'
  });

  const [colorMetadata, setColorMetadata] = useState<ColorMetadata>({});

  useEffect(() => {
    if (brandKit) {
      // Try to load from color_details first, fall back to flat columns
      const cd = brandKit.color_details as ColorDetails | null;
      const hasColorDetails = cd && Object.keys(cd).some(k => cd[k]?.light?.hex);

      setFormData({
        name: brandKit.name || '',
        description: brandKit.description || '',
        website_url: brandKit.website_url || '',
        tagline: brandKit.tagline || '',
        brand_voice: brandKit.brand_voice || '',
        summary: brandKit.summary || '',
        primary_color: hasColorDetails ? (cd?.primary?.light?.hex || '') : (brandKit.primary_color || ''),
        secondary_color: hasColorDetails ? (cd?.secondary?.light?.hex || '') : (brandKit.secondary_color || ''),
        accent_color: hasColorDetails ? (cd?.accent?.light?.hex || '') : (brandKit.accent_color || ''),
        background_color: hasColorDetails ? (cd?.background?.light?.hex || '') : (brandKit.background_color || ''),
        text_primary_color: hasColorDetails ? (cd?.text_primary?.light?.hex || '') : (brandKit.text_primary_color || ''),
        text_secondary_color: hasColorDetails ? (cd?.text_secondary?.light?.hex || '') : (brandKit.text_secondary_color || ''),
        link_color: hasColorDetails ? (cd?.link?.light?.hex || '') : (brandKit.link_color || ''),
        color_scheme: brandKit.color_scheme || '',
        heading_font: brandKit.heading_font || '',
        body_font: brandKit.body_font || '',
        paragraph_font: brandKit.paragraph_font || '',
        font_sizes: (brandKit.font_sizes as Record<string, string>) || {},
        font_weights: (brandKit.font_weights as Record<string, number>) || {},
        logo_url: brandKit.logo_url || '',
        favicon_url: brandKit.favicon_url || '',
        og_image_url: brandKit.og_image_url || '',
        custom_1_color: hasColorDetails ? (cd?.custom_1?.light?.hex || '') : ((brandKit as any).custom_1_color || ''),
        custom_1_name: hasColorDetails ? (cd?.custom_1?.name || '') : ((brandKit as any).custom_1_name || ''),
        custom_2_color: hasColorDetails ? (cd?.custom_2?.light?.hex || '') : ((brandKit as any).custom_2_color || ''),
        custom_2_name: hasColorDetails ? (cd?.custom_2?.name || '') : ((brandKit as any).custom_2_name || ''),
        custom_3_color: hasColorDetails ? (cd?.custom_3?.light?.hex || '') : ((brandKit as any).custom_3_color || ''),
        custom_3_name: hasColorDetails ? (cd?.custom_3?.name || '') : ((brandKit as any).custom_3_name || ''),
        custom_4_color: hasColorDetails ? (cd?.custom_4?.light?.hex || '') : ((brandKit as any).custom_4_color || ''),
        custom_4_name: hasColorDetails ? (cd?.custom_4?.name || '') : ((brandKit as any).custom_4_name || ''),
        status: brandKit.status || 'draft'
      });

      // Parse color metadata from color_details, fall back to additional_colors._metadata
      if (hasColorDetails && cd) {
        const metadata: ColorMetadata = {};
        for (const [role, entry] of Object.entries(cd)) {
          if (entry?.light?.description || entry?.light?.useWhen) {
            // Map role to the metadata key format used by the UI
            const metaKey = ['primary', 'secondary', 'accent'].includes(role) ? `${role}_color` : role;
            metadata[metaKey] = {
              description: entry.light.description || '',
              useWhen: entry.light.useWhen || '',
            };
          }
        }
        setColorMetadata(metadata);
      } else {
        const additionalColors = brandKit.additional_colors as any;
        if (additionalColors && typeof additionalColors === 'object' && !Array.isArray(additionalColors) && additionalColors._metadata) {
          setColorMetadata(additionalColors._metadata as ColorMetadata);
        } else {
          setColorMetadata({});
        }
      }
    }
  }, [brandKit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value as 'draft' | 'active' | 'archived' }));
  };

  const handleColorSchemeChange = (value: string) => {
    setFormData(prev => ({ ...prev, color_scheme: value }));
  };

  const handleColorChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to build color_details from current form state + metadata
  const buildColorDetails = useCallback((currentFormData: typeof formData, currentMetadata: ColorMetadata): ColorDetails => {
    const colorMap: Record<string, { formColorKey: string; formNameKey?: string; metaKey: string }> = {
      primary: { formColorKey: 'primary_color', metaKey: 'primary_color' },
      secondary: { formColorKey: 'secondary_color', metaKey: 'secondary_color' },
      accent: { formColorKey: 'accent_color', metaKey: 'accent_color' },
      background: { formColorKey: 'background_color', metaKey: 'background_color' },
      text_primary: { formColorKey: 'text_primary_color', metaKey: 'text_primary_color' },
      text_secondary: { formColorKey: 'text_secondary_color', metaKey: 'text_secondary_color' },
      link: { formColorKey: 'link_color', metaKey: 'link_color' },
      custom_1: { formColorKey: 'custom_1_color', formNameKey: 'custom_1_name', metaKey: 'custom_1' },
      custom_2: { formColorKey: 'custom_2_color', formNameKey: 'custom_2_name', metaKey: 'custom_2' },
      custom_3: { formColorKey: 'custom_3_color', formNameKey: 'custom_3_name', metaKey: 'custom_3' },
      custom_4: { formColorKey: 'custom_4_color', formNameKey: 'custom_4_name', metaKey: 'custom_4' },
    };

    const details: ColorDetails = {};
    for (const [role, mapping] of Object.entries(colorMap)) {
      const hex = (currentFormData as any)[mapping.formColorKey] || '';
      const meta = currentMetadata[mapping.metaKey];
      if (hex) {
        details[role] = {
          ...(mapping.formNameKey ? { name: (currentFormData as any)[mapping.formNameKey] || '' } : {}),
          light: {
            hex,
            description: meta?.description || '',
            useWhen: meta?.useWhen || '',
          },
        };
      } else {
        details[role] = {};
      }
    }
    return details;
  }, []);

  const handleColorMetadataChange = useCallback(async (newMetadata: ColorMetadata) => {
    setColorMetadata(newMetadata);
    
    // Build color_details from current form + new metadata
    const colorDetails = buildColorDetails(formData, newMetadata);

    try {
      await updateBrandKit({
        id: brandKit.id,
        color_details: colorDetails as any,
      });
    } catch {
      // Error handled in hook
    }
  }, [brandKit, updateBrandKit, formData, buildColorDetails]);

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

        // Update colorMetadata state to reflect extracted values immediately
        if (Object.keys(extractedColorDetails).length > 0) {
          setColorMetadata(prev => {
            const updated = { ...prev };
            for (const [role, detail] of Object.entries(extractedColorDetails)) {
              updated[role] = { description: detail.light?.description || '', useWhen: detail.light?.useWhen || '' };
            }
            return updated;
          });
        }

        toast({ title: 'Brand extracted successfully!' });

        // Check for target audience suggestion
        const targetAudience = data.personality?.targetAudience;
        if (targetAudience && typeof targetAudience === 'string') {
          setDetectedAudience(targetAudience);
          setShowAudienceSuggestion(true);
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      // Build color_details from current form + metadata
      const colorDetails = buildColorDetails(formData, colorMetadata);

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
        color_details: colorDetails as any,
        status: formData.status
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleAssetUpload = async (field: string, url: string) => {
    await updateBrandKit({ id: brandKit.id, [field]: url });
  };

  const handleAssetDelete = async (field: string) => {
    await updateBrandKit({ id: brandKit.id, [field]: null });
  };

  return (
    <div className="space-y-6">
      {/* Inline Name Editing */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              className="text-2xl font-bold h-10 max-w-md"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={handleSaveName}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancelNameEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-2xl font-bold">{brandKit.name}</h1>
            <Button 
              size="icon" 
              variant="ghost" 
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditingName(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Card */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Completion Progress</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isUpdating} size="sm">
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={brandKit.completion_percentage} className="flex-1 h-3" />
              <span className="font-bold text-lg">{brandKit.completion_percentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Personas & Industry Classification side by side */}
        <div className="grid gap-6 md:grid-cols-2">
          <PersonaOverviewCard brandKitId={brandKit.id} />

          {/* Industry Classification Card */}
          <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Industry & Sector</CardTitle>
            <p className="text-sm text-muted-foreground">
              Classify your brand's industry for better AI context
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={selectedIndustry || ''} onValueChange={handleIndustryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sub-Industry</Label>
                <Select 
                  value={selectedSubindustry || ''} 
                  onValueChange={handleSubindustryChange}
                  disabled={!selectedIndustry || subindustries.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {subindustries.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sector</Label>
                <Select 
                  value={selectedSector || ''} 
                  onValueChange={handleSectorChange}
                  disabled={!selectedSubindustry || sectors.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <BasicInfoCard
            formData={formData}
            onInputChange={handleInputChange}
            onStatusChange={handleStatusChange}
            onExtractClick={() => setShowExtractConfirm(true)}
            isExtracting={isExtracting}
            userRole={userRole}
          />

          <BrandColorsCard
            brandKitId={brandKit.id}
            formData={formData}
            colorMetadata={colorMetadata}
            onColorSchemeChange={handleColorSchemeChange}
            onColorChange={handleColorChange}
            onColorMetadataChange={handleColorMetadataChange}
          />

          <UIColorsCard
            formData={formData}
            onColorChange={handleColorChange}
          />

          <TypographyCard
            formData={formData}
            onInputChange={handleInputChange}
            onFontSizesChange={(sizes) => setFormData(prev => ({ ...prev, font_sizes: sizes }))}
            onFontWeightsChange={(weights) => setFormData(prev => ({ ...prev, font_weights: weights }))}
          />

          <LogoAssetsCard
            brandKitId={brandKit.id}
            formData={formData}
            onFieldChange={handleFieldChange}
            onAssetUpload={handleAssetUpload}
            onAssetDelete={handleAssetDelete}
          />

          <AISummaryCard
            value={formData.summary}
            onChange={(value) => setFormData(prev => ({ ...prev, summary: value }))}
          />
        </div>

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

        <TargetAudienceSuggestionDialog
          open={showAudienceSuggestion}
          onOpenChange={setShowAudienceSuggestion}
          brandKitId={brandKit.id}
          targetAudienceText={detectedAudience}
        />

      </form>
    </div>
  );
}
