import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import {
  STORAGE_CONFIG,
  buildUserFilePath,
  buildBrandKitFilePath,
  extractPathFromStorageUrl,
  isAllowedFileType,
  isValidFileSize,
} from './constants';

export type UploadContext = 'user' | 'brand-kit';

export interface UseFileUploadOptions {
  /** Storage bucket name */
  bucket?: string;
  /** Upload context determines path structure */
  context: UploadContext;
  /** Required for brand-kit context */
  brandKitId?: string;
  /** Allowed MIME types (defaults to images) */
  allowedTypes?: readonly string[];
  /** Max file size in bytes (defaults to 5MB) */
  maxSizeBytes?: number;
}

export interface UseFileUploadReturn {
  /** Upload a file and return the public URL */
  upload: (file: File, fileName: string) => Promise<string | null>;
  /** Remove a file by its public URL */
  remove: (fileUrl: string) => Promise<boolean>;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Whether a delete is in progress */
  isDeleting: boolean;
}

/**
 * Reusable hook for file uploads to Supabase storage
 * Handles validation, path construction, upload/delete operations
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const {
    bucket = STORAGE_CONFIG.BUCKET,
    context,
    brandKitId,
    allowedTypes = STORAGE_CONFIG.ALLOWED_IMAGE_TYPES,
    maxSizeBytes = STORAGE_CONFIG.MAX_FILE_SIZE,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const upload = useCallback(
    async (file: File, fileName: string): Promise<string | null> => {
      // Validate file type
      if (!isAllowedFileType(file, allowedTypes)) {
        toast({
          title: 'Invalid file type',
          description: `Please select a valid file type: ${allowedTypes.join(', ')}`,
          variant: 'destructive',
        });
        return null;
      }

      // Validate file size
      if (!isValidFileSize(file, maxSizeBytes)) {
        const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
        toast({
          title: 'File too large',
          description: `Please select a file under ${maxSizeMB}MB`,
          variant: 'destructive',
        });
        return null;
      }

      setIsUploading(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: 'Authentication required',
            description: 'Please sign in to upload files',
            variant: 'destructive',
          });
          return null;
        }

        // Build file path based on context
        let filePath: string;
        if (context === 'user') {
          filePath = buildUserFilePath(user.id, fileName);
        } else if (context === 'brand-kit') {
          if (!brandKitId) {
            toast({
              title: 'Configuration error',
              description: 'Brand kit ID is required for brand kit uploads',
              variant: 'destructive',
            });
            return null;
          }
          filePath = buildBrandKitFilePath(brandKitId, user.id, fileName);
        } else {
          throw new Error(`Unknown upload context: ${context}`);
        }

        // Upload file with upsert
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        // Add cache-busting timestamp
        const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

        return urlWithTimestamp;
      } catch (error: any) {
        console.error('File upload error:', error);
        toast({
          title: 'Upload failed',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, context, brandKitId, allowedTypes, maxSizeBytes]
  );

  const remove = useCallback(
    async (fileUrl: string): Promise<boolean> => {
      const filePath = extractPathFromStorageUrl(fileUrl);
      if (!filePath) {
        toast({
          title: 'Invalid URL',
          description: 'Could not extract file path from URL',
          variant: 'destructive',
        });
        return false;
      }

      setIsDeleting(true);

      try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);

        if (error) {
          throw error;
        }

        return true;
      } catch (error: any) {
        console.error('File delete error:', error);
        toast({
          title: 'Delete failed',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [bucket]
  );

  return {
    upload,
    remove,
    isUploading,
    isDeleting,
  };
}
