import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Plus, X, GripVertical } from 'lucide-react';
import { ExtractedColor, CoreColorAssignment, ROLE_LABELS, CUSTOM_SLOTS } from './types';

interface AssignColorsStepProps {
  selectedColors: ExtractedColor[];
  coreAssignments: CoreColorAssignment[];
  extendedColors: ExtractedColor[];
  onUpdateAssignment: (role: CoreColorAssignment['role'], updates: Partial<CoreColorAssignment>) => void;
  onAddCustomSlot: () => void;
  onRemoveCustomSlot: (role: CoreColorAssignment['role']) => void;
  onMoveToExtended: (colorId: string) => void;
  onMoveToCore: (color: ExtractedColor) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function AssignColorsStep({
  selectedColors,
  coreAssignments,
  extendedColors,
  onUpdateAssignment,
  onAddCustomSlot,
  onRemoveCustomSlot,
  onMoveToExtended,
  onMoveToCore,
  onBack,
  onContinue,
}: AssignColorsStepProps) {
  const [expandedRole, setExpandedRole] = useState<CoreColorAssignment['role'] | null>(null);

  // Get unassigned colors (selected but not in core or extended)
  const assignedColorIds = new Set([
    ...coreAssignments.filter(a => a.color).map(a => a.color!.id),
    ...extendedColors.map(c => c.id),
  ]);
  const unassignedColors = selectedColors.filter(c => !assignedColorIds.has(c.id));

  const customSlotsInUse = coreAssignments.filter(a => CUSTOM_SLOTS.includes(a.role));
  const canAddCustomSlot = customSlotsInUse.length < 4;

  return (
    <div className="space-y-6">
      {/* Core Colors Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Core Color Palette</h3>
          <span className="text-xs text-muted-foreground">Up to 8 colors</span>
        </div>

        <div className="space-y-2">
          {coreAssignments.map((assignment) => (
            <div
              key={assignment.role}
              className="border rounded-lg p-3 space-y-3"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                
                {/* Color swatch */}
                <div
                  className="w-8 h-8 rounded-full border shadow-sm flex-shrink-0"
                  style={{ backgroundColor: assignment.color?.hex || '#E5E5E5' }}
                />

                {/* Role name / custom name */}
                <div className="flex-1 min-w-0">
                  {CUSTOM_SLOTS.includes(assignment.role) ? (
                    <Input
                      value={assignment.customName || ''}
                      onChange={(e) => onUpdateAssignment(assignment.role, { customName: e.target.value })}
                      placeholder={ROLE_LABELS[assignment.role]}
                      className="h-8"
                    />
                  ) : (
                    <span className="font-medium">{ROLE_LABELS[assignment.role]}</span>
                  )}
                </div>

                {/* Color selector */}
                <Select
                  value={assignment.color?.id || ''}
                  onValueChange={(colorId) => {
                    const color = selectedColors.find(c => c.id === colorId);
                    onUpdateAssignment(assignment.role, { color: color || null });
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {[...unassignedColors, assignment.color].filter(Boolean).map((color) => (
                      <SelectItem key={color!.id} value={color!.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color!.hex }}
                          />
                          <span className="font-mono text-xs">{color!.hex}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Expand/collapse for details */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedRole(expandedRole === assignment.role ? null : assignment.role)}
                >
                  {expandedRole === assignment.role ? 'Less' : 'More'}
                </Button>

                {/* Remove custom slot */}
                {CUSTOM_SLOTS.includes(assignment.role) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveCustomSlot(assignment.role)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Expanded details */}
              {expandedRole === assignment.role && (
                <div className="grid gap-3 pl-7 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={assignment.description || ''}
                      onChange={(e) => onUpdateAssignment(assignment.role, { description: e.target.value })}
                      placeholder="What this color represents..."
                      className="min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Use When</Label>
                    <Textarea
                      value={assignment.useWhen || ''}
                      onChange={(e) => onUpdateAssignment(assignment.role, { useWhen: e.target.value })}
                      placeholder="When to use this color..."
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add custom slot button */}
          {canAddCustomSlot && (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={onAddCustomSlot}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Color Slot
            </Button>
          )}
        </div>
      </div>

      {/* Extended Colors Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Extended Color Palette</h3>
          <span className="text-xs text-muted-foreground">Additional colors</span>
        </div>

        {extendedColors.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {extendedColors.map((color) => (
              <div
                key={color.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
              >
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-sm">{color.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onMoveToCore(color)}
                  title="Move to core"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            No extended colors. Unassigned colors will appear here.
          </p>
        )}

        {/* Unassigned colors */}
        {unassignedColors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Unassigned colors:</p>
            <div className="flex flex-wrap gap-2">
              {unassignedColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => onMoveToExtended(color.id)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-full hover:bg-muted transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm">{color.name}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue}>
          Save & Finish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
