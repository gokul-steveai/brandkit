import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Target, Heart, MessageSquare, Shield, Package, Users, Palette, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { EXPORT_SECTIONS, SectionCompleteness, VisualIdentityExportMode } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { extractVisualIdentityData } from '@/lib/generators/visualIdentityGenerator';
import type { BrandKit } from '@/hooks/useBrandKits';

type SectionStatus = 'complete' | 'in_progress' | 'not_started';

const getSectionStatus = (completeness: SectionCompleteness | undefined): SectionStatus => {
  if (!completeness || completeness.completenessPercent === 0) return 'not_started';
  if (completeness.completenessPercent === 100) return 'complete';
  return 'in_progress';
};

const getCardBackgroundClass = (status: SectionStatus, isSelected: boolean): string => {
  if (isSelected) {
    switch (status) {
      case 'complete': return 'border-success bg-success/20';
      case 'in_progress': return 'border-warning bg-warning/20';
      case 'not_started': return 'border-destructive bg-destructive/20';
    }
  }
  switch (status) {
    case 'complete': return 'bg-success/10 hover:bg-success/15';
    case 'in_progress': return 'bg-warning/10 hover:bg-warning/15';
    case 'not_started': return 'bg-destructive/10 hover:bg-destructive/15';
  }
};

const getBadgeConfig = (status: SectionStatus): { text: string; className: string } => {
  switch (status) {
    case 'complete':
      return { text: 'Complete', className: 'bg-success text-success-foreground border-success' };
    case 'in_progress':
      return { text: 'Incomplete', className: 'bg-warning text-warning-foreground border-warning' };
    case 'not_started':
      return { text: 'Not Started', className: 'bg-destructive/20 text-destructive border-destructive' };
  }
};

const getProgressBarClass = (status: SectionStatus): string => {
  switch (status) {
    case 'complete': return 'bg-success';
    case 'in_progress': return 'bg-warning';
    case 'not_started': return 'bg-destructive';
  }
};

const iconMap: Record<string, React.ReactNode> = {
  Palette: <Palette className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  MessageSquare: <MessageSquare className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
};

interface SectionSelectionStepProps {
  selectedSections: string[];
  onSectionsChange: (sections: string[]) => void;
  onCompletenessCalculated: (completeness: SectionCompleteness[]) => void;
  visualIdentityMode?: VisualIdentityExportMode;
  onVisualIdentityModeChange?: (mode: VisualIdentityExportMode) => void;
}

export function SectionSelectionStep({
  selectedSections,
  onSectionsChange,
  onCompletenessCalculated,
  visualIdentityMode,
  onVisualIdentityModeChange,
}: SectionSelectionStepProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const [completeness, setCompleteness] = useState<SectionCompleteness[]>([]);
  const [loading, setLoading] = useState(true);
  const [visualIdentityStats, setVisualIdentityStats] = useState({ coreColors: 0, extendedColors: 0, hasTypography: false });

  useEffect(() => {
    if (brandKitId) {
      calculateCompleteness();
    }
  }, [brandKitId]);

  const calculateCompleteness = async () => {
    if (!brandKitId) return;
    
    setLoading(true);
    const results: SectionCompleteness[] = [];

    try {
      // Fetch all related data
      const [
        { data: brandKit },
        { data: core },
        { data: personality },
        { data: expression },
        { data: governance },
        { data: products },
        { data: audience },
      ] = await Promise.all([
        supabase.from('brand_kits').select('*').eq('id', brandKitId).single(),
        supabase.from('brand_kit_core').select('*').eq('brand_kit_id', brandKitId).single(),
        supabase.from('brand_kit_personality').select('*').eq('brand_kit_id', brandKitId).single(),
        supabase.from('brand_kit_expression').select('*').eq('brand_kit_id', brandKitId).single(),
        supabase.from('brand_kit_governance').select('*').eq('brand_kit_id', brandKitId).single(),
        supabase.from('brand_kit_products').select('*').eq('brand_kit_id', brandKitId),
        supabase.from('brand_kit_target_audience').select('*').eq('brand_kit_id', brandKitId),
      ]);

      // Calculate visual identity stats
      if (brandKit) {
        const viData = extractVisualIdentityData(brandKit as unknown as BrandKit);
        setVisualIdentityStats({
          coreColors: viData.coreColors.length,
          extendedColors: viData.extendedColors.length,
          hasTypography: viData.typography.length > 0,
        });
      }

      const dataMap: Record<string, unknown> = {
        brand_kits: brandKit,
        brand_kit_core: core,
        brand_kit_personality: personality,
        brand_kit_expression: expression,
        brand_kit_governance: governance,
        brand_kit_products: products,
        brand_kit_target_audience: audience,
      };

      for (const section of EXPORT_SECTIONS) {
        const data = dataMap[section.dataSource];
        const allFields = [...section.requiredFields, ...section.optionalFields];
        
        let filledFields: string[] = [];
        let missingFields: string[] = [];
        let hasData = false;

        if (Array.isArray(data)) {
          // For products and audience, check if array has items
          hasData = data.length > 0;
          // Use synthetic 'items' field for array-based sections to properly calculate completeness
          filledFields = hasData ? ['items'] : [];
          missingFields = hasData ? [] : ['items'];
        } else if (data) {
          hasData = true;
          for (const field of allFields) {
            const value = (data as Record<string, unknown>)[field];
            if (value !== null && value !== undefined && value !== '' && 
                !(Array.isArray(value) && value.length === 0) &&
                !(typeof value === 'object' && Object.keys(value).length === 0)) {
              filledFields.push(field);
            } else {
              missingFields.push(field);
            }
          }
        } else {
          missingFields = allFields;
        }

        const totalFields = allFields.length || 1;
        const completenessPercent = Math.round((filledFields.length / totalFields) * 100);

        results.push({
          sectionId: section.id,
          completenessPercent,
          filledFields,
          missingFields,
          hasData,
        });
      }

      setCompleteness(results);
      onCompletenessCalculated(results);
    } catch (error) {
      console.error('Error calculating completeness:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    if (selectedSections.includes(sectionId)) {
      onSectionsChange(selectedSections.filter(id => id !== sectionId));
    } else {
      onSectionsChange([...selectedSections, sectionId]);
    }
  };

  const selectAll = () => {
    onSectionsChange(EXPORT_SECTIONS.map(s => s.id));
  };

  const deselectAll = () => {
    onSectionsChange([]);
  };

  const getSectionCompleteness = (sectionId: string) => {
    return completeness.find(c => c.sectionId === sectionId);
  };

  const averageCompleteness = completeness.length > 0
    ? Math.round(
        completeness
          .filter(c => selectedSections.includes(c.sectionId))
          .reduce((sum, c) => sum + c.completenessPercent, 0) / 
        (selectedSections.length || 1)
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Kit Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Select which sections to include in your export
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          {EXPORT_SECTIONS.map((section) => {
            const sectionCompleteness = getSectionCompleteness(section.id);
            const isSelected = selectedSections.includes(section.id);
            const status = getSectionStatus(sectionCompleteness);
            const badgeConfig = getBadgeConfig(status);

            return (
              <Card
                key={section.id}
                className={`p-4 cursor-pointer transition-all ${getCardBackgroundClass(status, isSelected)}`}
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSection(section.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="p-2 bg-muted rounded-lg">
                    {iconMap[section.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{section.name}</h3>
                      <Badge variant="outline" className={`text-xs ${badgeConfig.className}`}>
                        {status === 'complete' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {badgeConfig.text}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                    {sectionCompleteness && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={sectionCompleteness.completenessPercent} className="h-1.5 flex-1" indicatorClassName={getProgressBarClass(status)} />
                        <span className="text-xs text-muted-foreground">
                          {sectionCompleteness.filledFields.length} of {
                            sectionCompleteness.filledFields.length + sectionCompleteness.missingFields.length
                          } fields
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedSections.length} sections selected
          </span>
          <span className="text-sm text-muted-foreground">
            {averageCompleteness}% average completeness
          </span>
        </div>
      </div>

      {/* Auto-Generated Documents Section - only show if visual identity handler is provided */}
      {onVisualIdentityModeChange && visualIdentityMode && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Auto-Generated Documents</h3>
          </div>

          <Card className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium">Visual Identity</h4>
                  <p className="text-sm text-muted-foreground">
                    {visualIdentityStats.coreColors} core colors
                    {visualIdentityStats.extendedColors > 0 && ` • ${visualIdentityStats.extendedColors} extended`}
                    {visualIdentityStats.hasTypography && ' • Typography'}
                  </p>
                </div>

                <RadioGroup
                  value={visualIdentityMode}
                  onValueChange={(value) => onVisualIdentityModeChange(value as VisualIdentityExportMode)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="vi-full" />
                    <Label htmlFor="vi-full" className="text-sm font-normal cursor-pointer">
                      Full Visual Identity
                      <span className="text-muted-foreground ml-2">— colors, extended palette, typography</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="core_colors_only" id="vi-core" />
                    <Label htmlFor="vi-core" className="text-sm font-normal cursor-pointer">
                      Core Color Palette Only
                      <span className="text-muted-foreground ml-2">— {visualIdentityStats.coreColors} core brand colors</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="vi-none" />
                    <Label htmlFor="vi-none" className="text-sm font-normal cursor-pointer">
                      Don't include
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
