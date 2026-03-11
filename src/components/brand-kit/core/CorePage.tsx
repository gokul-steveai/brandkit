import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MissionVisionCard } from './MissionVisionCard';
import { BrandStoryCard } from './BrandStoryCard';
import { BrandPromisesCard } from './BrandPromisesCard';
import { SaveStatusHeader, AddNewCard } from '../shared';
import { ProductCard, ProductDialog, ProductEmptyState } from '../products';
import type { Product } from '../products/types';
import { emptyProduct } from '../products/types';
import { supabase } from '@/integrations/supabase/client';
import { BrandKit } from '@/hooks/useBrandKits';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { useWebhookTrigger } from '@/hooks/useWebhookTrigger';
import { useUpgradePrompt } from '@/components/subscription/UpgradeModal';
import { useToast } from '@/hooks/useToast';
import { FeatureGate } from '@/components/subscription/FeatureGate';

interface BrandPromise {
  title: string;
  description: string;
}

interface BrandKitCore {
  id?: string;
  brand_kit_id: string;
  mission: string;
  vision: string;
  brand_story: string;
  brand_promises: BrandPromise[];
}

export function CorePage() {
  const { brandKit } = useOutletContext<{ brandKit: BrandKit }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [coreId, setCoreId] = useState<string | undefined>();
  const [productsOpen, setProductsOpen] = useState(true);
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newBenefit, setNewBenefit] = useState('');
  
  const { getLimit, canCreateMore } = useBrandKitSubscription(brandKit.id);
  const { promptUpgrade, UpgradePromptModal } = useUpgradePrompt();
  
  const productLimit = getLimit('products');
  const canAddMore = canCreateMore('products', products.length);
  
  const [formData, setFormData] = useState<BrandKitCore>({
    brand_kit_id: brandKit.id,
    mission: '',
    vision: '',
    brand_story: '',
    brand_promises: []
  });

  // Save function for auto-save
  const performSave = useCallback(async () => {
    const dataToSave = {
      brand_kit_id: formData.brand_kit_id,
      mission: formData.mission,
      vision: formData.vision,
      brand_story: formData.brand_story,
      brand_promises: formData.brand_promises as unknown as any
    };
    
    if (coreId) {
      const { error } = await supabase
        .from('brand_kit_core')
        .update(dataToSave)
        .eq('id', coreId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('brand_kit_core')
        .insert(dataToSave)
        .select()
        .single();
      if (error) throw error;
      if (data) setCoreId(data.id);
    }
  }, [formData, coreId]);

  const webhookTrigger = useWebhookTrigger(brandKit.id);

  // Auto-save hook - only enable after initial data load
  const { autoSaveEnabled, hasUnsavedChanges, isSaving: isAutoSaving, manualSave } = useAutoSave({
    data: { formData },
    onSave: performSave,
    onAfterSave: webhookTrigger,
    enabled: isInitialLoadComplete
  });

  // Warn user about unsaved changes when leaving page (browser navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!autoSaveEnabled && hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaveEnabled, hasUnsavedChanges]);

  // Load existing core data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load core data
        const { data: coreData } = await supabase
          .from('brand_kit_core')
          .select('*')
          .eq('brand_kit_id', brandKit.id)
          .maybeSingle();

        if (coreData) {
          setCoreId(coreData.id);
          setFormData({
            id: coreData.id,
            brand_kit_id: coreData.brand_kit_id,
            mission: coreData.mission || '',
            vision: coreData.vision || '',
            brand_story: coreData.brand_story || '',
            brand_promises: Array.isArray(coreData.brand_promises) 
              ? (coreData.brand_promises as unknown as BrandPromise[])
              : []
          });
        }
      } finally {
        setIsLoading(false);
        setIsInitialLoadComplete(true);
      }
    };

    loadData();
  }, [brandKit.id]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setIsProductsLoading(true);
      const { data, error } = await supabase
        .from('brand_kit_products')
        .select('*')
        .eq('brand_kit_id', brandKit.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setProducts(data.map(p => ({
          ...p,
          key_benefits: Array.isArray(p.key_benefits) ? p.key_benefits as string[] : []
        })));
      }
      setIsProductsLoading(false);
    };

    loadProducts();
  }, [brandKit.id]);

  // Product handlers
  const handleAddProduct = () => {
    if (!canAddMore) {
      promptUpgrade({ reason: 'limit', limitType: 'Products' });
      return;
    }
    setEditingProduct({ ...emptyProduct, brand_kit_id: brandKit.id });
    setNewBenefit('');
    setShowDialog(true);
  };

  const handleEditProduct = (product: Product) => {
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

  const handleSaveProduct = async () => {
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

  const handleDeleteProduct = async (id: string) => {
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
      <div className="space-y-6 max-w-5xl">
        {/* Save button skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        {/* 2-column grid skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-2 border-border">
              <CardHeader>
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <UpgradePromptModal />
      
      <SaveStatusHeader
        autoSaveEnabled={autoSaveEnabled}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isAutoSaving}
        onSave={manualSave}
      />

      {/* 2-column grid for core cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <MissionVisionCard
          mission={formData.mission}
          vision={formData.vision}
          onMissionChange={(value) => setFormData(prev => ({ ...prev, mission: value }))}
          onVisionChange={(value) => setFormData(prev => ({ ...prev, vision: value }))}
        />

        <BrandStoryCard
          value={formData.brand_story}
          onChange={(value) => setFormData(prev => ({ ...prev, brand_story: value }))}
        />

        <BrandPromisesCard
          title="Brand Promises"
          description="Key commitments your brand makes to customers"
          tip="Add clear, actionable promises that define what customers can expect from your brand."
          tipFormat="Customer First: We prioritize your needs"
          items={formData.brand_promises}
          onChange={(items) => setFormData(prev => ({ ...prev, brand_promises: items }))}
        />
      </div>

      {/* Products Section - Full Width Collapsible */}
      <FeatureGate feature="products" brandKitId={brandKit.id}>
        <Collapsible open={productsOpen} onOpenChange={setProductsOpen}>
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Products & Services</h3>
                    <p className="text-sm text-muted-foreground">Define your product catalog with features and pricing</p>
                  </div>
                  {productsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-4">
                {isProductsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <ProductEmptyState onAddFirst={handleAddProduct} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </FeatureGate>

      <ProductDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        product={editingProduct}
        onProductChange={setEditingProduct}
        onSave={handleSaveProduct}
        isSaving={isSaving}
        newBenefit={newBenefit}
        setNewBenefit={setNewBenefit}
        onAddBenefit={addBenefit}
        onRemoveBenefit={removeBenefit}
      />
    </div>
  );
}
