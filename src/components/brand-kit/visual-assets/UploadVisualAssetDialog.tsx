import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X, Image, Link, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  AssetType, 
  ASSET_TYPES, 
  EXPIRATION_OPTIONS, 
  VISUAL_ASSET_CONFIG,
  STORAGE_LIMITS,
} from './types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UploadVisualAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentStorageUsed: number;
  tier: string;
}

interface FileToUpload {
  file: File;
  preview: string;
  assetType: AssetType;
  title: string;
  expirationDays: number | null;
}

export function UploadVisualAssetDialog({
  open,
  onOpenChange,
  onSuccess,
  currentStorageUsed,
  tier,
}: UploadVisualAssetDialogProps) {
  const { id: brandKitId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const storageLimit = STORAGE_LIMITS[tier] || STORAGE_LIMITS.free;
  const remainingStorage = storageLimit - currentStorageUsed;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFiles = (fileList: FileList | File[]) => {
    const newFiles: FileToUpload[] = [];
    const fileArray = Array.from(fileList);

    for (const file of fileArray) {
      // Validate file type
      if (!VISUAL_ASSET_CONFIG.ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image format`);
        continue;
      }

      // Validate file size
      if (file.size > VISUAL_ASSET_CONFIG.MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 10 MB size limit`);
        continue;
      }

      // Check storage limit
      const totalNewSize = newFiles.reduce((sum, f) => sum + f.file.size, 0) + file.size;
      if (totalNewSize > remainingStorage) {
        toast.error(`Not enough storage space for ${file.name}`);
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        assetType: 'other',
        title: file.name.replace(/\.[^/.]+$/, ''),
        expirationDays: null,
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [remainingStorage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return;

    try {
      // Fetch the image to validate and get size
      const response = await fetch(urlInput);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      if (!VISUAL_ASSET_CONFIG.ALLOWED_TYPES.includes(blob.type)) {
        toast.error('URL does not point to a supported image format');
        return;
      }

      if (blob.size > VISUAL_ASSET_CONFIG.MAX_FILE_SIZE) {
        toast.error('Image exceeds the 10 MB size limit');
        return;
      }

      const fileName = urlInput.split('/').pop() || 'image';
      const file = new File([blob], fileName, { type: blob.type });
      
      processFiles([file]);
      setUrlInput('');
    } catch (error) {
      toast.error('Failed to load image from URL');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFile = (index: number, updates: Partial<FileToUpload>) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], ...updates };
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (!user || !brandKitId || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let uploadedCount = 0;

      for (const fileData of files) {
        const timestamp = Date.now();
        const sanitizedFileName = fileData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${brandKitId}/${user.id}/${fileData.assetType}/${timestamp}_${sanitizedFileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from(VISUAL_ASSET_CONFIG.BUCKET)
          .upload(storagePath, fileData.file);

        if (uploadError) {
          toast.error(`Failed to upload ${fileData.file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(VISUAL_ASSET_CONFIG.BUCKET)
          .getPublicUrl(storagePath);

        // Calculate expiration
        let expiresAt: string | null = null;
        if (fileData.expirationDays) {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + fileData.expirationDays);
          expiresAt = expDate.toISOString();
        }

        // Insert database record
        const { error: dbError } = await supabase
          .from('user_visual_assets')
          .insert({
            brand_kit_id: brandKitId,
            user_id: user.id,
            file_name: fileData.file.name,
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            file_size_bytes: fileData.file.size,
            mime_type: fileData.file.type,
            asset_type: fileData.assetType,
            title: fileData.title,
            expires_at: expiresAt,
          });

        if (dbError) {
          toast.error(`Failed to save ${fileData.file.name}: ${dbError.message}`);
          // Clean up uploaded file
          await supabase.storage.from(VISUAL_ASSET_CONFIG.BUCKET).remove([storagePath]);
          continue;
        }

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // Update storage used
      const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
      await supabase
        .from('user_subscriptions')
        .update({ storage_used_bytes: currentStorageUsed + totalSize })
        .eq('user_id', user.id);

      toast.success(`Successfully uploaded ${uploadedCount} image${uploadedCount !== 1 ? 's' : ''}`);
      
      // Cleanup
      files.forEach(f => URL.revokeObjectURL(f.preview));
      setFiles([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during upload');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Visual Assets</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="files" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files">
              <Image className="h-4 w-4 mr-2" />
              Local Files
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="h-4 w-4 mr-2" />
              From URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-4">
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop images here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports JPEG, PNG, GIF, WebP, SVG • Max 10 MB each
              </p>
              <Input
                type="file"
                accept={VISUAL_ASSET_CONFIG.ALLOWED_TYPES.join(',')}
                multiple
                className="hidden"
                id="file-upload"
                onChange={handleFileSelect}
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Select Files
                </label>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button onClick={handleUrlAdd} disabled={!urlInput.trim()}>
                Add
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-4 mt-6">
            <h4 className="font-medium">Selected Images ({files.length})</h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex gap-4 p-3 border rounded-lg">
                  <img
                    src={file.preview}
                    alt={file.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <Input
                        value={file.title}
                        onChange={(e) => updateFile(index, { title: e.target.value })}
                        placeholder="Title"
                        className="h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={file.assetType}
                        onValueChange={(v) => updateFile(index, { assetType: v as AssetType })}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={file.expirationDays?.toString() || 'null'}
                        onValueChange={(v) => updateFile(index, { 
                          expirationDays: v === 'null' ? null : parseInt(v) 
                        })}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Expiration" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRATION_OPTIONS.map(opt => (
                            <SelectItem 
                              key={opt.value?.toString() || 'null'} 
                              value={opt.value?.toString() || 'null'}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Storage Warning */}
        {files.length > 0 && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Total size: {(files.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024)).toFixed(2)} MB
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-center text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
