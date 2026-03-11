import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Eye, RefreshCw, Download, Check } from 'lucide-react';
import { BrandKit } from '@/hooks/useBrandKits';
import { 
  generateVisualIdentityMarkdown, 
  extractVisualIdentityData, 
  hasVisualIdentityData 
} from '@/lib/generators/visualIdentityGenerator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VisualIdentityCardProps {
  brandKit: BrandKit;
  onUpdate: () => void;
}

export function VisualIdentityCard({ brandKit, onUpdate }: VisualIdentityCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasData = hasVisualIdentityData(brandKit);
  const data = extractVisualIdentityData(brandKit);
  const markdown = generateVisualIdentityMarkdown(brandKit);

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brandKit.name.toLowerCase().replace(/\s+/g, '-')}-visual-identity.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Color preview swatches (max 6)
  const previewColors = data.coreColors.slice(0, 6);

  return (
    <>
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">Visual Identity</h3>
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                Auto-Generated
              </Badge>
              {hasData && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              Colors, typography, and brand style guidelines generated from your brand kit.
            </p>

            {/* Color swatches preview */}
            {previewColors.length > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {previewColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border shadow-sm"
                    style={{ backgroundColor: color.hex }}
                    title={`${color.name}: ${color.hex}`}
                  />
                ))}
                {data.coreColors.length > 6 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    +{data.coreColors.length - 6} more
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
              <span>{data.coreColors.length} core colors</span>
              <span>•</span>
              <span>{data.extendedColors.length} extended colors</span>
              <span>•</span>
              <span>{data.typography.length} fonts</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onUpdate}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownload}
                disabled={!hasData}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visual Identity Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
