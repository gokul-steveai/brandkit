import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Image, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { VisualAsset, AssetType, ASSET_TYPES, VISUAL_ASSET_CONFIG } from './types';
import { StorageUsageBar } from './StorageUsageBar';
import { VisualAssetCard } from './VisualAssetCard';
import { UploadVisualAssetDialog } from './UploadVisualAssetDialog';
import { AssetDetailDialog } from './AssetDetailDialog';

export function VisualAssetsSection() {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [storageUsed, setStorageUsed] = useState(0);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<VisualAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyzingAssetId, setAnalyzingAssetId] = useState<string | null>(null);

  const tier = subscription?.subscription_tier || 'free';

  const fetchAssets = useCallback(async () => {
    if (!brandKitId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_visual_assets')
        .select('*')
        .eq('brand_kit_id', brandKitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets((data || []) as unknown as VisualAsset[]);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load visual assets');
    } finally {
      setIsLoading(false);
    }
  }, [brandKitId]);

  const fetchStorageUsed = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('storage_used_bytes')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setStorageUsed(data?.storage_used_bytes || 0);
    } catch (error) {
      console.error('Error fetching storage:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchAssets();
    fetchStorageUsed();
  }, [fetchAssets, fetchStorageUsed]);

  const handleViewAsset = (asset: VisualAsset) => {
    setSelectedAsset(asset);
    setDetailDialogOpen(true);
  };

  const handleAnalyzeFromCard = async (asset: VisualAsset) => {
    if (!asset.public_url) {
      toast.error('No image URL available');
      return;
    }

    setAnalyzingAssetId(asset.id);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageUrl: asset.public_url,
          includeCharacter: true,
          includeObjects: true,
        },
      });

      if (error) throw error;

      if (data?.success && data?.analysis) {
        const analysisDescription = [
          data.analysis.subjectAction,
          data.analysis.setting,
          data.analysis.moodStyle,
        ].filter(Boolean).join(' ');

        const { error: updateError } = await supabase
          .from('user_visual_assets')
          .update({ 
            ai_analysis: data.analysis, 
            description: analysisDescription 
          })
          .eq('id', asset.id);

        if (updateError) throw updateError;

        // Update local state immediately for real-time feel
        setAssets(prev => prev.map(a => 
          a.id === asset.id 
            ? { ...a, ai_analysis: data.analysis, description: analysisDescription }
            : a
        ));
        
        toast.success('AI analysis complete!');
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze image');
    } finally {
      setAnalyzingAssetId(null);
    }
  };

  const handleDeleteClick = (asset: VisualAsset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete || !user) return;

    setIsDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(VISUAL_ASSET_CONFIG.BUCKET)
        .remove([assetToDelete.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_visual_assets')
        .delete()
        .eq('id', assetToDelete.id);

      if (dbError) throw dbError;

      // Update storage used
      const newStorageUsed = Math.max(0, storageUsed - assetToDelete.file_size_bytes);
      await supabase
        .from('user_subscriptions')
        .update({ storage_used_bytes: newStorageUsed })
        .eq('user_id', user.id);

      setStorageUsed(newStorageUsed);
      setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
      toast.success('Asset deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete asset');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };

  // Update selectedAsset when assets array changes (for real-time updates in dialog)
  useEffect(() => {
    if (selectedAsset) {
      const updatedAsset = assets.find(a => a.id === selectedAsset.id);
      if (updatedAsset) {
        setSelectedAsset(updatedAsset);
      }
    }
  }, [assets, selectedAsset?.id]);

  const filteredAssets = filterType === 'all' 
    ? assets 
    : assets.filter(a => a.asset_type === filterType);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            <CardTitle className="text-lg">Visual Assets</CardTitle>
            <Badge variant="secondary">{assets.length}</Badge>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Usage */}
        <StorageUsageBar usedBytes={storageUsed} tier={tier} />

        {/* Filter */}
        {assets.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ASSET_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Assets Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No visual assets yet</p>
            <p className="text-sm mt-1">Upload images to use in your brand kit exports</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredAssets.map(asset => (
              <VisualAssetCard
                key={asset.id}
                asset={asset}
                onView={handleViewAsset}
                onAnalyze={handleAnalyzeFromCard}
                onDelete={handleDeleteClick}
                isAnalyzing={analyzingAssetId === asset.id}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <UploadVisualAssetDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {
          fetchAssets();
          fetchStorageUsed();
        }}
        currentStorageUsed={storageUsed}
        tier={tier}
      />

      {/* Detail Dialog */}
      <AssetDetailDialog
        asset={selectedAsset}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedAsset(null);
        }}
        onUpdate={fetchAssets}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visual Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assetToDelete?.title || assetToDelete?.file_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
