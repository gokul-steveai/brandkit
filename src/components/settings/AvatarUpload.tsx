import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import { Camera, Loader2, User } from 'lucide-react';
import { 
  STORAGE_CONFIG, 
  buildUserFilePath, 
  isAllowedFileType, 
  isValidFileSize 
} from '@/lib/storage/constants';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
  onAvatarUpdate: (url: string) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, fullName, onAvatarUpdate }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isAllowedFileType(file)) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      // Create file path: users/{userId}/avatar.ext
      const fileExt = file.name.split('.').pop();
      const filePath = buildUserFilePath(userId, `avatar.${fileExt}`);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_CONFIG.BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_CONFIG.BUCKET)
        .getPublicUrl(filePath);

      // Add cache-busting timestamp
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(urlWithTimestamp);
      toast({ title: 'Avatar updated successfully' });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({ title: 'Failed to upload avatar', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20 border-2 border-border">
          <AvatarImage src={currentAvatarUrl || undefined} alt={fullName || 'User'} />
          <AvatarFallback className="bg-muted text-lg">
            {fullName ? getInitials(fullName) : <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          {currentAvatarUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG or GIF. Max 5MB.
        </p>
      </div>
    </div>
  );
}
