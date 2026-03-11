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

interface LogoAssetData {
  id?: string;
  asset_key: string;
  label: string;
  url: string;
  description: string;
  usage_guidelines: string;
  image_width: number | null;
  image_height: number | null;
  file_size_bytes: number | null;
  file_type: string | null;
}

interface LogoAssetDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: LogoAssetData | null;
  onSave: (data: { label: string; description: string; usage_guidelines: string }) => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LogoAssetDetailDialog({
  open,
  onOpenChange,
  asset,
  onSave,
}: LogoAssetDetailDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [usageGuidelines, setUsageGuidelines] = useState('');

  const isDefaultAsset = asset?.asset_key === 'logo' || asset?.asset_key === 'favicon' || asset?.asset_key === 'og_image';

  useEffect(() => {
    if (open && asset) {
      setLabel(asset.label || '');
      setDescription(asset.description || '');
      setUsageGuidelines(asset.usage_guidelines || '');
    }
  }, [open, asset]);

  const handleSave = () => {
    onSave({ label, description, usage_guidelines: usageGuidelines });
    onOpenChange(false);
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isDefaultAsset ? asset.label : 'Edit Asset'}</DialogTitle>
          <DialogDescription>View and edit asset details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name / Label (editable for non-default assets) */}
          {!isDefaultAsset && (
            <div className="space-y-1.5">
              <Label htmlFor="assetLabel">Name</Label>
              <Input
                id="assetLabel"
                placeholder="e.g. Logo - Dark Background"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          )}

          {/* Image Preview */}
          {asset.url && (
            <div className="flex justify-center bg-muted/30 rounded-md p-4">
              <img
                src={asset.url}
                alt={asset.label}
                className="max-h-32 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* URL (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">URL</Label>
            <Input value={asset.url || ''} readOnly className="text-xs bg-muted/30" />
          </div>

          {/* Metadata row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Dimensions</Label>
              <p className="text-sm font-medium">
                {asset.image_width && asset.image_height
                  ? `${asset.image_width} × ${asset.image_height}`
                  : 'Unknown'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">File Size</Label>
              <p className="text-sm font-medium">{formatFileSize(asset.file_size_bytes)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">File Type</Label>
              <p className="text-sm font-medium">{asset.file_type || 'Unknown'}</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="assetDescription">Description</Label>
            <Textarea
              id="assetDescription"
              placeholder="Describe this asset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Usage Guidelines */}
          <div className="space-y-1.5">
            <Label htmlFor="assetUsage">Usage Guidelines</Label>
            <Textarea
              id="assetUsage"
              placeholder="When and how should this asset be used..."
              value={usageGuidelines}
              onChange={(e) => setUsageGuidelines(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
