import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { AddColorDialog } from './AddColorDialog';
import { ColorFormData, ColorMetadata, CUSTOM_COLOR_SLOTS } from './types';
import { Link } from 'react-router-dom';

interface ColorSlot {
  key: string;
  label: string;
  colorValue: string;
  nameValue?: string;
  isCustom: boolean;
  isEditable: boolean;
}

interface BrandColorsCardProps {
  brandKitId: string;
  formData: {
    color_scheme: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    custom_1_color?: string;
    custom_1_name?: string;
    custom_2_color?: string;
    custom_2_name?: string;
    custom_3_color?: string;
    custom_3_name?: string;
    custom_4_color?: string;
    custom_4_name?: string;
  };
  colorMetadata: ColorMetadata;
  onColorSchemeChange: (value: string) => void;
  onColorChange: (field: string, value: string) => void;
  onColorMetadataChange: (metadata: ColorMetadata) => void;
}

export function BrandColorsCard({
  brandKitId,
  formData,
  colorMetadata,
  onColorSchemeChange,
  onColorChange,
  onColorMetadataChange,
}: BrandColorsCardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ColorSlot | null>(null);

  // Build the list of color slots - 4 default + up to 4 custom
  const colorSlots = useMemo((): ColorSlot[] => {
    const slots: ColorSlot[] = [
      {
        key: 'primary_color',
        label: 'Primary',
        colorValue: formData.primary_color || '',
        isCustom: false,
        isEditable: true,
      },
      {
        key: 'secondary_color',
        label: 'Secondary',
        colorValue: formData.secondary_color || '',
        isCustom: false,
        isEditable: true,
      },
      {
        key: 'accent_color',
        label: 'Accent',
        colorValue: formData.accent_color || '',
        isCustom: false,
        isEditable: true,
      },
      {
        key: 'background_color',
        label: 'Background',
        colorValue: formData.background_color || '',
        isCustom: false,
        isEditable: true,
      },
    ];

    // Add custom color slots that have values
    CUSTOM_COLOR_SLOTS.forEach((slot) => {
      const colorKey = `${slot}_color` as keyof typeof formData;
      const nameKey = `${slot}_name` as keyof typeof formData;
      const colorValue = formData[colorKey] || '';
      const nameValue = formData[nameKey] || '';

      if (colorValue) {
        slots.push({
          key: slot,
          label: nameValue || slot.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          colorValue,
          nameValue,
          isCustom: true,
          isEditable: true,
        });
      }
    });

    return slots;
  }, [formData]);

  // Find the next available custom slot
  const getNextAvailableSlot = (): string | null => {
    for (const slot of CUSTOM_COLOR_SLOTS) {
      const colorKey = `${slot}_color` as keyof typeof formData;
      if (!formData[colorKey]) {
        return slot;
      }
    }
    return null;
  };

  const handleAddColor = (data: ColorFormData) => {
    const nextSlot = getNextAvailableSlot();
    if (!nextSlot) return;

    onColorChange(`${nextSlot}_color`, data.hex);
    onColorChange(`${nextSlot}_name`, data.name);
    
    if (data.description || data.useWhen) {
      onColorMetadataChange({
        ...colorMetadata,
        [nextSlot]: { description: data.description, useWhen: data.useWhen },
      });
    }
  };

  const handleEditColor = (slot: ColorSlot) => {
    setEditingSlot(slot);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (data: ColorFormData) => {
    if (!editingSlot) return;

    if (editingSlot.isCustom) {
      onColorChange(`${editingSlot.key}_color`, data.hex);
      onColorChange(`${editingSlot.key}_name`, data.name);
    } else {
      onColorChange(editingSlot.key, data.hex);
    }

    // Save metadata (description & useWhen)
    const metaKey = editingSlot.key;
    onColorMetadataChange({
      ...colorMetadata,
      [metaKey]: { description: data.description, useWhen: data.useWhen },
    });

    setEditingSlot(null);
  };

  const handleDeleteColor = (slot: ColorSlot) => {
    if (!slot.isCustom) return;
    onColorChange(`${slot.key}_color`, '');
    onColorChange(`${slot.key}_name`, '');
    // Clean up metadata
    const { [slot.key]: _, ...rest } = colorMetadata;
    onColorMetadataChange(rest);
  };

  const handleColorInputChange = (slot: ColorSlot, value: string) => {
    if (slot.isCustom) {
      onColorChange(`${slot.key}_color`, value);
    } else {
      onColorChange(slot.key, value);
    }
  };

  const canAddMore = getNextAvailableSlot() !== null;
  const customColorCount = colorSlots.filter((s) => s.isCustom).length;

  return (
    <>
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg">Brand Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Color Scheme Selector */}
          <div className="space-y-2">
            <Label htmlFor="color_scheme">Color Scheme</Label>
            <Select value={formData.color_scheme} onValueChange={onColorSchemeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Grid - 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            {colorSlots.map((slot) => (
              <div
                key={slot.key}
                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30"
              >
                {/* Color Swatch */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-8 h-8 rounded-full border-2 border-border flex-shrink-0 cursor-pointer"
                        style={{ backgroundColor: slot.colorValue || '#E5E5E5' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{slot.colorValue || 'Not set'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Color Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{slot.label}</p>
                  <Input
                    value={slot.colorValue}
                    onChange={(e) => handleColorInputChange(slot, e.target.value)}
                    placeholder="#000000"
                    className="h-7 text-xs mt-1"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEditColor(slot)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {slot.isCustom && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteColor(slot)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Color Button - shows in grid if we can add more */}
            {canAddMore && (
              <Button
                variant="outline"
                className="h-[72px] border-dashed flex flex-col gap-1"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs">Add Color</span>
              </Button>
            )}
          </div>

          {/* Footer - link to Visual Identity */}
          <div className="pt-2 border-t border-border">
            <Link
              to={`/brand-kits/${brandKitId}/edit/knowledge`}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View all colors in Visual Identity
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Add Color Dialog */}
      <AddColorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddColor}
        mode="add"
      />

      {/* Edit Color Dialog */}
      <AddColorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
        mode="edit"
        editingColor={
          editingSlot
            ? {
                name: editingSlot.label,
                hex: editingSlot.colorValue,
                description: colorMetadata[editingSlot.key]?.description || '',
                useWhen: colorMetadata[editingSlot.key]?.useWhen || '',
                slotName: editingSlot.key,
              }
            : undefined
        }
      />
    </>
  );
}
