import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { BrandKit } from '@/hooks/useBrandKits';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { useUpgradePrompt } from '@/components/subscription/UpgradeModal';
import { AddNewCard } from '@/components/brand-kit/shared';
import { Product, emptyProduct } from './types';
import { ProductEmptyState } from './ProductEmptyState';
import { ProductCard } from './ProductCard';
import { ProductDialog } from './ProductDialog';

export function ProductsPage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const { toast } = useToast();
  const { getLimit, canCreateMore } = useBrandKitSubscription(brandKit.id);
  const { promptUpgrade, UpgradePromptModal } = useUpgradePrompt();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newBenefit, setNewBenefit] = useState('');
  
  const productLimit = getLimit('products');
  const canAddMore = canCreateMore('products', products.length);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('brand_kit_products')
          .select('*')
          .eq('brand_kit_id', brandKit.id)
          .order('created_at');

        if (error) throw error;
        if (data) {
          setProducts(data.map(p => ({
            ...p,
            key_benefits: Array.isArray(p.key_benefits) ? p.key_benefits as string[] : []
          })));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [brandKit.id]);

  const handleAddProduct = () => {
    if (!canAddMore) {
      promptUpgrade({ reason: 'limit', limitType: 'Products' });
      return;
    }
    openNewProduct();
  };

  const openNewProduct = () => {
    setEditingProduct({ ...emptyProduct, brand_kit_id: brandKit.id });
    setNewBenefit('');
    setShowDialog(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setNewBenefit('');
    setShowDialog(true);
  };

  const addBenefit = () => {
    if (newBenefit.trim() && editingProduct) {
      setEditingProduct(prev => prev ? {
        ...prev,
        key_benefits: [...prev.key_benefits, newBenefit.trim()]
      } : null);
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    if (editingProduct) {
      setEditingProduct(prev => prev ? {
        ...prev,
        key_benefits: prev.key_benefits.filter((_, i) => i !== index)
      } : null);
    }
  };

  const handleSave = async () => {
    if (!editingProduct || !editingProduct.name.trim()) return;
    setIsSaving(true);

    try {
      const { id, ...dataToSave } = editingProduct;

      if (id) {
        const { error } = await supabase
          .from('brand_kit_products')
          .update(dataToSave)
          .eq('id', id);
        if (error) throw error;
        setProducts(prev => prev.map(p => p.id === id ? editingProduct : p));
      } else {
        const { data, error } = await supabase
          .from('brand_kit_products')
          .insert(dataToSave)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setProducts(prev => [...prev, { ...data, key_benefits: data.key_benefits as string[] || [] }]);
        }
      }

      toast({ title: 'Product saved successfully' });
      setShowDialog(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast({
        title: 'Failed to save product',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brand_kit_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Product deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete product',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="border-2 border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="products" brandKitId={brandKit.id}>
      <UpgradePromptModal />
      <div className="space-y-6 max-w-4xl animate-fade-in">
        {products.length === 0 ? (
          <ProductEmptyState onAddFirst={handleAddProduct} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={openEditProduct}
                onDelete={handleDelete}
              />
            ))}
            <AddNewCard
              title="Add Product"
              description="Add a new product or service"
              onClick={handleAddProduct}
              disabled={!canAddMore}
              disabledReason={productLimit !== -1 ? `Upgrade to add more than ${productLimit} products` : undefined}
            />
          </div>
        )}

        <ProductDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          product={editingProduct}
          onProductChange={setEditingProduct}
          onSave={handleSave}
          isSaving={isSaving}
          newBenefit={newBenefit}
          setNewBenefit={setNewBenefit}
          onAddBenefit={addBenefit}
          onRemoveBenefit={removeBenefit}
        />
      </div>
    </FeatureGate>
  );
}
