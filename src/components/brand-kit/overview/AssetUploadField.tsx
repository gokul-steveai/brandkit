import { useState, useRef } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface AssetUploadFieldProps {
  label: string;
  assetFileName: string; // e.g., 'primary_logo', 'favicon', 'og_image'
  value: string;
  brandKitId: string;
  onChange: (value: string) => void;
  onUploadComplete?: (url: string) => Promise<void>; // Called after successful upload to persist to DB
  onDeleteComplete?: () => Promise<void>; // Called after successful delete to persist to DB
  placeholder?: string;
}

export function AssetUploadField({
  label,
  assetFileName,
  value,
  brandKitId,
  onChange,
  onUploadComplete,
  onDeleteComplete,
  placeholder = 'https://example.com/image.png',
}: AssetUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if the URL is from our storage bucket
  const isStorageUrl = value?.includes('storage') && value?.includes(STORAGE_CONFIG.BUCKET);

  const getFileExtension = (file: File): string => {
    const name = file.name;
    const lastDot = name.lastIndexOf('.');
    return lastDot !== -1 ? name.slice(lastDot) : '.jpg';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isAllowedFileType(file)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a valid image file (JPG, PNG, GIF, WebP, ICO, or SVG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get current user for path construction
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to upload files',
          variant: 'destructive',
        });
        return;
      }

      const extension = getFileExtension(file);
      // New path structure: brand-kits/{brandKitId}/{userId}/{assetFileName}{extension}
      const filePath = buildBrandKitFilePath(brandKitId, user.id, `${assetFileName}${extension}`);

      // Upload with upsert to replace existing file
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_CONFIG.BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_CONFIG.BUCKET)
        .getPublicUrl(filePath);

      // Add cache buster to ensure fresh image
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      onChange(publicUrl);

      // Auto-save to database if callback provided
      if (onUploadComplete) {
        try {
          await onUploadComplete(publicUrl);
        } catch (saveError) {
          console.error('Failed to save asset URL to database:', saveError);
          // Don't show error toast - the file is uploaded, just not saved to DB yet
        }
      }

      toast({ title: `${label} uploaded successfully` });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);

    try {
      // If it's a storage URL, delete from storage first
      if (isStorageUrl) {
        const filePath = extractPathFromStorageUrl(value);
        if (filePath) {
          const { error } = await supabase.storage
            .from(STORAGE_CONFIG.BUCKET)
            .remove([filePath]);
          if (error) throw error;
        }
      }

      onChange('');

      // Auto-save to database if callback provided
      if (onDeleteComplete) {
        try {
          await onDeleteComplete();
        } catch (saveError) {
          console.error('Failed to clear asset URL in database:', saveError);
        }
      }

      toast({ title: `${label} deleted successfully` });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-3 items-start">
      {/* Left: Square preview */}
      {value && (
        <div
          className="relative w-14 h-14 flex-shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <img
            src={value}
            alt={`${label} preview`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          
          {/* Delete overlay - show for all assets with a value */}
          {isHovering && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Right: Label + Input row */}
      <div className="flex-1 space-y-1.5">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-9 w-9 flex-shrink-0"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this image from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
