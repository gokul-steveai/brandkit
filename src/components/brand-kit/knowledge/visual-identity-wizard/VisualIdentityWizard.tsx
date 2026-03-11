import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { SelectSourceStep } from './SelectSourceStep';
import { PreviewColorsStep } from './PreviewColorsStep';
import { AssignColorsStep } from './AssignColorsStep';
import {
  VisualIdentityWizardState,
  ExtractedColor,
  CoreColorAssignment,
  DEFAULT_CORE_ASSIGNMENTS,
  CUSTOM_SLOTS,
} from './types';

interface VisualIdentityWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  brandKit: {
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    background_color?: string | null;
    custom_1_color?: string | null;
    custom_1_name?: string | null;
    custom_2_color?: string | null;
    custom_2_name?: string | null;
    custom_3_color?: string | null;
    custom_3_name?: string | null;
    custom_4_color?: string | null;
    custom_4_name?: string | null;
    additional_colors?: unknown;
  };
  onComplete: () => void;
}

export function VisualIdentityWizard({
  open,
  onOpenChange,
  brandKitId,
  brandKit,
  onComplete,
}: VisualIdentityWizardProps) {
  const [state, setState] = useState<VisualIdentityWizardState>({
    step: 'source',
    extractedColors: [],
    coreAssignments: [...DEFAULT_CORE_ASSIGNMENTS],
    extendedColors: [],
    isExtracting: false,
    sourceType: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Check if brand kit has existing colors
  const hasExistingColors = !!(
    brandKit.primary_color ||
    brandKit.secondary_color ||
    brandKit.accent_color ||
    brandKit.background_color
  );

  const resetWizard = () => {
    setState({
      step: 'source',
      extractedColors: [],
      coreAssignments: [...DEFAULT_CORE_ASSIGNMENTS],
      extendedColors: [],
      isExtracting: false,
      sourceType: null,
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const handleColorsExtracted = (colors: ExtractedColor[], sourceType: 'file' | 'url', sourceUrl?: string) => {
    setState(prev => ({
      ...prev,
      extractedColors: colors,
      sourceType,
      sourceUrl,
      step: 'preview',
    }));
  };

  const handleUseExisting = () => {
    // Convert existing brand kit colors to extracted colors
    const existingColors: ExtractedColor[] = [];
    
    if (brandKit.primary_color) {
      existingColors.push({
        id: 'existing-primary',
        hex: brandKit.primary_color,
        name: 'Primary',
        source: 'manual',
        isSelected: true,
      });
    }
    if (brandKit.secondary_color) {
      existingColors.push({
        id: 'existing-secondary',
        hex: brandKit.secondary_color,
        name: 'Secondary',
        source: 'manual',
        isSelected: true,
      });
    }
    if (brandKit.accent_color) {
      existingColors.push({
        id: 'existing-accent',
        hex: brandKit.accent_color,
        name: 'Accent',
        source: 'manual',
        isSelected: true,
      });
    }
    if (brandKit.background_color) {
      existingColors.push({
        id: 'existing-background',
        hex: brandKit.background_color,
        name: 'Background',
        source: 'manual',
        isSelected: true,
      });
    }

    // Add custom colors
    const customSlots = [
      { color: brandKit.custom_1_color, name: brandKit.custom_1_name },
      { color: brandKit.custom_2_color, name: brandKit.custom_2_name },
      { color: brandKit.custom_3_color, name: brandKit.custom_3_name },
      { color: brandKit.custom_4_color, name: brandKit.custom_4_name },
    ];

    customSlots.forEach((slot, i) => {
      if (slot.color) {
        existingColors.push({
          id: `existing-custom-${i + 1}`,
          hex: slot.color,
          name: slot.name || `Custom ${i + 1}`,
          source: 'manual',
          isSelected: true,
        });
      }
    });

    // Add additional colors
    if (brandKit.additional_colors && Array.isArray(brandKit.additional_colors)) {
      (brandKit.additional_colors as Array<{ hex: string; name: string }>).forEach((color, i) => {
        existingColors.push({
          id: `existing-additional-${i}`,
          hex: color.hex,
          name: color.name,
          source: 'manual',
          isSelected: true,
        });
      });
    }

    setState(prev => ({
      ...prev,
      extractedColors: existingColors,
      sourceType: 'existing',
      step: 'preview',
    }));
  };

  const handleToggleColor = (colorId: string) => {
    setState(prev => ({
      ...prev,
      extractedColors: prev.extractedColors.map(c =>
        c.id === colorId ? { ...c, isSelected: !c.isSelected } : c
      ),
    }));
  };

  const handleSelectAll = () => {
    setState(prev => ({
      ...prev,
      extractedColors: prev.extractedColors.map(c => ({ ...c, isSelected: true })),
    }));
  };

  const handleDeselectAll = () => {
    setState(prev => ({
      ...prev,
      extractedColors: prev.extractedColors.map(c => ({ ...c, isSelected: false })),
    }));
  };

  const handleUpdateAssignment = (role: CoreColorAssignment['role'], updates: Partial<CoreColorAssignment>) => {
    setState(prev => ({
      ...prev,
      coreAssignments: prev.coreAssignments.map(a =>
        a.role === role ? { ...a, ...updates } : a
      ),
    }));
  };

  const handleAddCustomSlot = () => {
    const usedCustomSlots = state.coreAssignments.filter(a => CUSTOM_SLOTS.includes(a.role)).map(a => a.role);
    const nextSlot = CUSTOM_SLOTS.find(slot => !usedCustomSlots.includes(slot));
    
    if (nextSlot) {
      setState(prev => ({
        ...prev,
        coreAssignments: [
          ...prev.coreAssignments,
          { role: nextSlot, color: null, customName: '', description: '', useWhen: '' },
        ],
      }));
    }
  };

  const handleRemoveCustomSlot = (role: CoreColorAssignment['role']) => {
    setState(prev => ({
      ...prev,
      coreAssignments: prev.coreAssignments.filter(a => a.role !== role),
    }));
  };

  const handleMoveToExtended = (colorId: string) => {
    const color = state.extractedColors.find(c => c.id === colorId);
    if (color) {
      setState(prev => ({
        ...prev,
        extendedColors: [...prev.extendedColors, color],
      }));
    }
  };

  const handleMoveToCore = (color: ExtractedColor) => {
    setState(prev => ({
      ...prev,
      extendedColors: prev.extendedColors.filter(c => c.id !== color.id),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build update object for brand_kits table
      const updates: Record<string, string | null | Array<{ hex: string; name: string }>> = {};

      state.coreAssignments.forEach(assignment => {
        if (assignment.role === 'primary') {
          updates.primary_color = assignment.color?.hex || null;
        } else if (assignment.role === 'secondary') {
          updates.secondary_color = assignment.color?.hex || null;
        } else if (assignment.role === 'accent') {
          updates.accent_color = assignment.color?.hex || null;
        } else if (assignment.role === 'background') {
          updates.background_color = assignment.color?.hex || null;
        } else if (assignment.role === 'custom_1') {
          updates.custom_1_color = assignment.color?.hex || null;
          updates.custom_1_name = assignment.customName || null;
        } else if (assignment.role === 'custom_2') {
          updates.custom_2_color = assignment.color?.hex || null;
          updates.custom_2_name = assignment.customName || null;
        } else if (assignment.role === 'custom_3') {
          updates.custom_3_color = assignment.color?.hex || null;
          updates.custom_3_name = assignment.customName || null;
        } else if (assignment.role === 'custom_4') {
          updates.custom_4_color = assignment.color?.hex || null;
          updates.custom_4_name = assignment.customName || null;
        }
      });

      // Build additional_colors array for extended colors
      updates.additional_colors = state.extendedColors.map(c => ({
        hex: c.hex,
        name: c.name,
      }));

      const { error } = await supabase
        .from('brand_kits')
        .update(updates)
        .eq('id', brandKitId);

      if (error) throw error;

      toast({ title: 'Colors saved', description: 'Visual identity colors have been updated' });
      handleClose();
      onComplete();
    } catch (error) {
      console.error('Save error:', error);
      toast({ 
        title: 'Save failed', 
        description: error instanceof Error ? error.message : 'Could not save colors',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stepProgress = state.step === 'source' ? 33 : state.step === 'preview' ? 66 : 100;
  const selectedColors = state.extractedColors.filter(c => c.isSelected);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {state.step === 'source' && 'Visual Identity Wizard'}
            {state.step === 'preview' && 'Preview Extracted Colors'}
            {state.step === 'assign' && 'Assign Colors'}
          </DialogTitle>
        </DialogHeader>

        <Progress value={stepProgress} className="mb-4" />

        {state.step === 'source' && (
          <SelectSourceStep
            onColorsExtracted={handleColorsExtracted}
            onUseExisting={handleUseExisting}
            hasExistingColors={hasExistingColors}
          />
        )}

        {state.step === 'preview' && (
          <PreviewColorsStep
            colors={state.extractedColors}
            onToggleColor={handleToggleColor}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBack={() => setState(prev => ({ ...prev, step: 'source' }))}
            onContinue={() => setState(prev => ({ ...prev, step: 'assign' }))}
          />
        )}

        {state.step === 'assign' && (
          <AssignColorsStep
            selectedColors={selectedColors}
            coreAssignments={state.coreAssignments}
            extendedColors={state.extendedColors}
            onUpdateAssignment={handleUpdateAssignment}
            onAddCustomSlot={handleAddCustomSlot}
            onRemoveCustomSlot={handleRemoveCustomSlot}
            onMoveToExtended={handleMoveToExtended}
            onMoveToCore={handleMoveToCore}
            onBack={() => setState(prev => ({ ...prev, step: 'preview' }))}
            onContinue={handleSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
