import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isLinkedInImageUrl, PLATFORM_CONFIGS } from './types';
import {
  LinkedInFields,
  InstagramFields,
  FacebookFields,
  TikTokFields,
  YouTubeFields,
  RedditFields,
} from './platform-fields';
import type { SocialProfile, SocialPlatform, ProfileType } from './types';

interface SocialProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SocialProfile | null;
  onSave: (updates: Partial<SocialProfile>) => Promise<void>;
  isNew?: boolean;
}

export function SocialProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
  isNew = false,
}: SocialProfileDialogProps) {
  const [formData, setFormData] = useState<Partial<SocialProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({ ...profile });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.[0] || formData.full_name?.[0] || formData.username?.[0] || '';
    const last = formData.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const platform = formData.platform as SocialPlatform | undefined;
  const profileType = formData.profile_type as ProfileType | undefined;
  const platformConfig = platform ? PLATFORM_CONFIGS[platform] : null;

  const renderPlatformFields = () => {
    switch (platform) {
      case 'linkedin':
        return <LinkedInFields formData={formData} onChange={setFormData} />;
      case 'instagram':
        return <InstagramFields formData={formData} onChange={setFormData} profileType={profileType} />;
      case 'facebook':
        return <FacebookFields formData={formData} onChange={setFormData} />;
      case 'tiktok':
        return <TikTokFields formData={formData} onChange={setFormData} />;
      case 'youtube':
        return <YouTubeFields formData={formData} onChange={setFormData} />;
      case 'reddit':
        return <RedditFields formData={formData} onChange={setFormData} />;
      default:
        return <LinkedInFields formData={formData} onChange={setFormData} />;
    }
  };

  const getProfileImageUrl = () => {
    // Prefer HD profile pic for Instagram
    if (platform === 'instagram' && formData.profile_pic_hd_url) {
      return formData.profile_pic_hd_url;
    }
    return formData.profile_image_url || formData.logo_url;
  };

  const canShowImage = () => {
    const url = getProfileImageUrl();
    if (!url) return false;
    // For LinkedIn, only show if it's a LinkedIn CDN URL
    if (platform === 'linkedin') return isLinkedInImageUrl(url);
    // For other platforms, show any valid URL
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                {platformConfig && (
                  <span className={`px-2 py-1 rounded text-xs text-white ${platformConfig.color}`}>
                    {platformConfig.name}
                  </span>
                )}
                {profileType && (
                  <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
                    {profileType === 'company' ? 'Company' : 'Personal'}
                  </span>
                )}
                {isNew ? 'Review Profile Data' : 'Edit Profile'}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-6 space-y-8">
              {/* Avatar Header */}
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {canShowImage() ? (
                    <AvatarImage src={getProfileImageUrl()} />
                  ) : null}
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  {/* Platform-specific fields handle their own header info */}
                  {renderPlatformFields()}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isNew ? 'Accept & Save' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
