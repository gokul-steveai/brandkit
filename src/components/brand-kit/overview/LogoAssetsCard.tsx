import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, Loader2, Image } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import {
  STORAGE_CONFIG,
  buildBrandKitFilePath,
  extractPathFromStorageUrl,
  isAllowedFileType,
  isValidFileSize,
} from '@/lib/storage/constants';
import { LogoAssetDetailDialog } from './LogoAssetDetailDialog';

interface LogoAsset {
  id: string;
  asset_key: string;
  label: string;
  url: string | null;
  description: string | null;
  usage_guidelines: string | null;
  image_width: number | null;
  image_height: number | null;
  file_size_bytes: number | null;
  file_type: string | null;
  storage_path: string | null;
  is_default: boolean;
  sort_order: number;
}

interface LogoAssetsCardProps {
  brandKitId: string;
  formData: {
    logo_url: string;
    favicon_url: string;
    og_image_url: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onAssetUpload: (field: string, url: string) => Promise<void>;
  onAssetDelete: (field: string) => Promise<void>;
}

const DEFAULT_ASSETS = [
  { asset_key: 'logo', label: 'Primary Logo', brand_kit_field: 'logo_url' },
  { asset_key: 'favicon', label: 'Favicon', brand_kit_field: 'favicon_url' },
  { asset_key: 'og_image', label: 'OG Image', brand_kit_field: 'og_image_url' },
];

export function LogoAssetsCard({
  brandKitId,
  formData,
  onFieldChange,
  onAssetUpload,
  onAssetDelete,
}: LogoAssetsCardProps) {
  const [assets, setAssets] = useState<LogoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LogoAsset | null>(null);
  const [editTarget, setEditTarget] = useState<LogoAsset | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  // Load assets from the new table
  useEffect(() => {
    loadAssets();
  }, [brandKitId]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_kit_logo_assets')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .order('sort_order');

      if (error) throw error;

      // Merge with defaults - ensure default assets always exist
      const existingKeys = new Set((data || []).map((a: any) => a.asset_key));
      const mergedAssets: LogoAsset[] = [...(data || []) as LogoAsset[]];

      for (const def of DEFAULT_ASSETS) {
        if (!existingKeys.has(def.asset_key)) {
          const url = formData[def.brand_kit_field as keyof typeof formData] || '';
          
          // If there's a URL in brand_kits but no record in brand_kit_logo_assets, auto-create it
          if (url) {
            try {
              const record = await ensureAssetRecord(def.asset_key, def.label, url);
              if (record) {
                mergedAssets.push({
                  ...(record as LogoAsset),
                  is_default: true,
                });
                continue;
              }
            } catch (e) {
              console.error(`Failed to auto-sync ${def.asset_key}:`, e);
            }
          }
          
          // Fallback: add temp placeholder
          mergedAssets.push({
            id: `temp-${def.asset_key}`,
            asset_key: def.asset_key,
            label: def.label,
            url: url || null,
            description: null,
            usage_guidelines: null,
            image_width: null,
            image_height: null,
            file_size_bytes: null,
            file_type: null,
            storage_path: null,
            is_default: true,
            sort_order: DEFAULT_ASSETS.indexOf(def),
          });
        }
      }

      // Sort: defaults first, then by sort_order
      mergedAssets.sort((a, b) => a.sort_order - b.sort_order);
      setAssets(mergedAssets);
    } catch (error) {
      console.error('Failed to load logo assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ensureAssetRecord = async (assetKey: string, label: string, url: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data, error } = await supabase
      .from('brand_kit_logo_assets')
      .upsert({
        brand_kit_id: brandKitId,
        user_id: user.user.id,
        asset_key: assetKey,
        label,
        url,
        is_default: DEFAULT_ASSETS.some(d => d.asset_key === assetKey),
      }, { onConflict: 'brand_kit_id,asset_key' })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const handleUploadClick = (assetKey: string) => {
    uploadTargetRef.current = assetKey;
    fileInputRef.current?.click();
  };

  const handleAddVariation = () => {
    const customCount = assets.filter(a => a.asset_key.startsWith('custom_')).length;
    const newKey = `custom_${customCount + 1}`;
    const newAsset: LogoAsset = {
      id: `temp-${newKey}`,
      asset_key: newKey,
      label: `Logo Variation ${customCount + 1}`,
      url: null,
      description: null,
      usage_guidelines: null,
      image_width: null,
      image_height: null,
      file_size_bytes: null,
      file_type: null,
      storage_path: null,
      is_default: false,
      sort_order: assets.length,
    };
    setAssets(prev => [...prev, newAsset]);
    // Trigger upload for the new variation
    setTimeout(() => handleUploadClick(newKey), 100);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const assetKey = uploadTargetRef.current;
    if (!file || !assetKey) return;

    if (!isAllowedFileType(file)) {
      toast({ title: 'Invalid file type', variant: 'destructive' });
      return;
    }
    if (!isValidFileSize(file)) {
      toast({ title: 'File too large (max 5MB)', variant: 'destructive' });
      return;
    }

    setUploadingKey(assetKey);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.jpg';
      const filePath = buildBrandKitFilePath(brandKitId, user.id, `${assetKey}${ext}`);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_CONFIG.BUCKET)
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_CONFIG.BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Get image dimensions
      const img = new window.Image();
      img.src = publicUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      const asset = assets.find(a => a.asset_key === assetKey);
      const label = asset?.label || assetKey;

      await ensureAssetRecord(assetKey, label, publicUrl);

      // Update metadata
      await supabase
        .from('brand_kit_logo_assets')
        .update({
          url: publicUrl,
          storage_path: filePath,
          image_width: img.naturalWidth || null,
          image_height: img.naturalHeight || null,
          file_size_bytes: file.size,
          file_type: file.type,
        })
        .eq('brand_kit_id', brandKitId)
        .eq('asset_key', assetKey);

      // Sync to brand_kits table for default assets
      const defaultAsset = DEFAULT_ASSETS.find(d => d.asset_key === assetKey);
      if (defaultAsset) {
        onFieldChange(defaultAsset.brand_kit_field, publicUrl);
        await onAssetUpload(defaultAsset.brand_kit_field, publicUrl);
      }

      await loadAssets();
      toast({ title: `${label} uploaded successfully` });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Delete from storage if applicable
      if (deleteTarget.storage_path) {
        await supabase.storage
          .from(STORAGE_CONFIG.BUCKET)
          .remove([deleteTarget.storage_path]);
      } else if (deleteTarget.url) {
        const path = extractPathFromStorageUrl(deleteTarget.url);
        if (path) {
          await supabase.storage.from(STORAGE_CONFIG.BUCKET).remove([path]);
        }
      }

      if (deleteTarget.is_default) {
        // For defaults, clear URL but keep record
        await supabase
          .from('brand_kit_logo_assets')
          .update({ url: null, storage_path: null, image_width: null, image_height: null, file_size_bytes: null, file_type: null })
          .eq('brand_kit_id', brandKitId)
          .eq('asset_key', deleteTarget.asset_key);

        const defaultAsset = DEFAULT_ASSETS.find(d => d.asset_key === deleteTarget.asset_key);
        if (defaultAsset) {
          onFieldChange(defaultAsset.brand_kit_field, '');
          await onAssetDelete(defaultAsset.brand_kit_field);
        }
      } else {
        // For custom assets, delete the record
        if (!deleteTarget.id.startsWith('temp-')) {
          await supabase
            .from('brand_kit_logo_assets')
            .delete()
            .eq('id', deleteTarget.id);
        }
      }

      await loadAssets();
      toast({ title: `${deleteTarget.label} deleted` });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDetailSave = async (data: { label: string; description: string; usage_guidelines: string }) => {
    if (!editTarget) return;
    try {
      await ensureAssetRecord(editTarget.asset_key, data.label || editTarget.label, editTarget.url || '');
      await supabase
        .from('brand_kit_logo_assets')
        .update({ label: data.label || editTarget.label, description: data.description, usage_guidelines: data.usage_guidelines })
        .eq('brand_kit_id', brandKitId)
        .eq('asset_key', editTarget.asset_key);
      await loadAssets();
      toast({ title: 'Asset details saved' });
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Failed to save details', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-2 border-border md:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">Logo & Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.asset_key}
              className="relative group"
              onMouseEnter={() => setHoveredAsset(asset.asset_key)}
              onMouseLeave={() => setHoveredAsset(null)}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1.5 truncate">
                {asset.label}
              </p>
              <div className="relative aspect-square bg-muted/30 border-2 border-border rounded-md flex items-center justify-center overflow-hidden">
                {uploadingKey === asset.asset_key ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : asset.url ? (
                  <img
                    src={asset.url}
                    alt={asset.label}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => handleUploadClick(asset.asset_key)}
                  >
                    <Image className="h-6 w-6" />
                    <span className="text-xs">Upload</span>
                  </button>
                )}

                {/* Hover overlay with actions */}
                {hoveredAsset === asset.asset_key && asset.url && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditTarget(asset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(asset)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add variation button */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">&nbsp;</p>
            <button
              type="button"
              onClick={handleAddVariation}
              className="aspect-square w-full border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs">Add Variation</span>
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this image. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <LogoAssetDetailDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        asset={editTarget ? {
          ...editTarget,
          url: editTarget.url || '',
          description: editTarget.description || '',
          usage_guidelines: editTarget.usage_guidelines || '',
        } : null}
        onSave={handleDetailSave}
      />
    </Card>
  );
}
