import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Eye, Download, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateProductCatalogMarkdown } from '@/lib/generators/productCatalogGenerator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProductCatalogCardProps {
  brandKitId: string;
  brandKitName: string;
}

export function ProductCatalogCard({ brandKitId, brandKitName }: ProductCatalogCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('brand_kit_products')
      .select('*')
      .eq('brand_kit_id', brandKitId);
    setProducts(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [brandKitId]);

  const hasData = products.length > 0;
  const markdown = hasData ? generateProductCatalogMarkdown(brandKitName, products) : '';

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brandKitName.toLowerCase().replace(/\s+/g, '-')}-product-catalog.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="p-4 opacity-60">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Product Catalog</h3>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`p-4 ${hasData ? 'border-primary/20 bg-primary/5' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${hasData ? 'bg-primary/10' : 'bg-muted'}`}>
            <Package className={`h-5 w-5 ${hasData ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">Product Catalog</h3>
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                Auto-Generated
              </Badge>
              {hasData && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  {products.length} product{products.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {hasData
                ? 'Product details, pricing, and benefits compiled from your Products & Services section.'
                : 'Add at least one product or service in the Core section to generate this document.'}
            </p>

            {!hasData && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>No products or services added</span>
              </div>
            )}

            {hasData && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={fetchProducts}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Product Catalog Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
