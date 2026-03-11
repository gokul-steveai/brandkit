import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ColorFormData } from './types';

interface AddColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ColorFormData) => void;
  editingColor?: ColorFormData & { slotName?: string };
  mode?: 'add' | 'edit';
}

export function AddColorDialog({
  open,
  onOpenChange,
  onSave,
  editingColor,
  mode = 'add',
}: AddColorDialogProps) {
  const [formData, setFormData] = useState<ColorFormData>({
    name: '',
    hex: '#000000',
    description: '',
    useWhen: '',
  });

  // Sync formData when editingColor changes or dialog opens
  useEffect(() => {
    if (open && editingColor) {
      setFormData({
        name: editingColor.name || '',
        hex: editingColor.hex || '#000000',
        description: editingColor.description || '',
        useWhen: editingColor.useWhen || '',
      });
    } else if (!open) {
      setFormData({ name: '', hex: '#000000', description: '', useWhen: '' });
    }
  }, [open, editingColor]);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.hex) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
    // Reset form
    setFormData({ name: '', hex: '#000000', description: '', useWhen: '' });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editingColor) {
      setFormData({
        name: editingColor.name,
        hex: editingColor.hex,
        description: editingColor.description || '',
        useWhen: editingColor.useWhen || '',
      });
    } else if (!newOpen) {
      setFormData({ name: '', hex: '#000000', description: '', useWhen: '' });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Color' : 'Add New Color'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the color details below.'
              : 'Add a new custom color to your brand palette.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="colorName">Color Name *</Label>
            <Input
              id="colorName"
              placeholder="e.g., Highlight Yellow"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="colorHex">Color Value *</Label>
            <div className="flex gap-2">
              <Input
                id="colorHex"
                placeholder="#FFCC00"
                value={formData.hex}
                onChange={(e) => setFormData((prev) => ({ ...prev, hex: e.target.value }))}
                className="flex-1"
              />
              <Input
                type="color"
                value={formData.hex || '#000000'}
                onChange={(e) => setFormData((prev) => ({ ...prev, hex: e.target.value }))}
                className="w-12 h-10 p-1 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="colorDescription">Description</Label>
            <Textarea
              id="colorDescription"
              placeholder="Describe what this color represents..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="colorUseWhen">Use When (AI Guidance)</Label>
            <Textarea
              id="colorUseWhen"
              placeholder="e.g., Use for call-to-action buttons and important highlights..."
              value={formData.useWhen}
              onChange={(e) => setFormData((prev) => ({ ...prev, useWhen: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name.trim() || !formData.hex}>
            {mode === 'edit' ? 'Save Changes' : 'Add Color'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
