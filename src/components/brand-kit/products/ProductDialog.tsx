import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Product } from './types';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onProductChange: (product: Product) => void;
  onSave: () => void;
  isSaving: boolean;
  newBenefit: string;
  setNewBenefit: (v: string) => void;
  onAddBenefit: () => void;
  onRemoveBenefit: (index: number) => void;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  onProductChange,
  onSave,
  isSaving,
  newBenefit,
  setNewBenefit,
  onAddBenefit,
  onRemoveBenefit
}: ProductDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>Define your product or service details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={product.name}
                onChange={(e) => onProductChange({ ...product, name: e.target.value })}
                placeholder="e.g., Premium Plan"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Input
                value={product.type}
                onChange={(e) => onProductChange({ ...product, type: e.target.value })}
                placeholder="e.g., SaaS, Service, Physical"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={product.description}
              onChange={(e) => onProductChange({ ...product, description: e.target.value })}
              placeholder="Describe what this product/service is..."
            />
          </div>

          <div>
            <Label>Unique Selling Proposition (USP)</Label>
            <Textarea
              value={product.usp}
              onChange={(e) => onProductChange({ ...product, usp: e.target.value })}
              placeholder="What makes this unique?"
            />
          </div>

          <div>
            <Label>Key Benefits</Label>
            <div className="space-y-2">
              {product.key_benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted border-2 border-border">
                  <span className="flex-1 text-sm">{benefit}</span>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveBenefit(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add a benefit..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddBenefit())}
                />
                <Button onClick={onAddBenefit} disabled={!newBenefit.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Competitive Differentiation</Label>
            <Textarea
              value={product.competitive_differentiation}
              onChange={(e) => onProductChange({ ...product, competitive_differentiation: e.target.value })}
              placeholder="How does this compare to competitors?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Cost/Price</Label>
              <Input
                type="number"
                value={product.cost || ''}
                onChange={(e) => onProductChange({ ...product, cost: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 99"
              />
            </div>
            <div>
              <Label>Special Pricing</Label>
              <Input
                value={product.special_pricing}
                onChange={(e) => onProductChange({ ...product, special_pricing: e.target.value })}
                placeholder="e.g., Annual discount, Enterprise pricing"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isSaving || !product.name.trim()}>
            {isSaving ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
