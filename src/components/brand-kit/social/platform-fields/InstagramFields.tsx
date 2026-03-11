import { Users, CheckCircle, Image, Tv, Lock, Building2, Link, Video, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SocialProfile, ProfileType } from '../types';

interface InstagramFieldsProps {
  formData: Partial<SocialProfile>;
  onChange: (data: Partial<SocialProfile>) => void;
  profileType?: ProfileType;
}

export function InstagramFields({ formData, onChange, profileType = 'personal' }: InstagramFieldsProps) {
  const isCompany = profileType === 'company';
  const externalUrls = formData.external_urls as Array<{ title: string; url: string; link_type: string }> | null;

  return (
    <div className="space-y-6">
      {/* Profile Picture URL */}
      <div>
        <Label htmlFor="profilePicUrl">Profile Picture URL</Label>
        <Input
          id="profilePicUrl"
          value={formData.profile_pic_hd_url || formData.profile_image_url || ''}
          onChange={(e) => onChange({ ...formData, profile_image_url: e.target.value, profile_pic_hd_url: e.target.value })}
          className="border-2"
          placeholder="Profile picture URL"
        />
      </div>

      <Separator />

      {/* Profile Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fullName">{isCompany ? 'Company Name' : 'Full Name'}</Label>
          <Input
            id="fullName"
            value={formData.full_name || formData.first_name || ''}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value, full_name: e.target.value })}
            className="border-2"
          />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username || ''}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            className="border-2"
            placeholder="@username"
          />
        </div>
      </div>

      {/* Business Category (if available) */}
      {formData.business_category && (
        <div>
          <Label htmlFor="businessCategory">Business Category</Label>
          <div className="flex items-center gap-2 mt-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formData.business_category}</span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        {formData.followers !== undefined && formData.followers !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.followers.toLocaleString()} followers</span>
          </div>
        )}
        {formData.follows_count !== undefined && formData.follows_count !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.follows_count.toLocaleString()} following</span>
          </div>
        )}
        {formData.posts_count !== undefined && formData.posts_count !== null && (
          <div className="flex items-center gap-1">
            <Image className="h-4 w-4" />
            <span>{formData.posts_count.toLocaleString()} posts</span>
          </div>
        )}
        {formData.verified && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        )}
        {formData.is_private && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Private
          </Badge>
        )}
        {formData.is_business_account && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Business
          </Badge>
        )}
        {formData.has_channel && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Tv className="h-3 w-3" />
            Has Channel
          </Badge>
        )}
      </div>

      {/* Additional Stats */}
      {(formData.highlight_reel_count || formData.igtv_video_count) && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {formData.highlight_reel_count !== undefined && formData.highlight_reel_count !== null && (
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <span>{formData.highlight_reel_count} highlights</span>
            </div>
          )}
          {formData.igtv_video_count !== undefined && formData.igtv_video_count !== null && (
            <div className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              <span>{formData.igtv_video_count} IGTV videos</span>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Biography */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Biography</h3>
        <Textarea
          value={formData.biography || formData.about || ''}
          onChange={(e) => onChange({ ...formData, biography: e.target.value, about: e.target.value })}
          className="border-2 min-h-[120px]"
          placeholder="Profile biography..."
        />
      </div>

      {/* External URL */}
      {formData.external_url && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Link className="h-4 w-4" />
            External Link
          </h3>
          <a 
            href={formData.external_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {formData.external_url}
          </a>
        </div>
      )}

      {/* Multiple External URLs (from Apify) */}
      {externalUrls && externalUrls.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Link className="h-4 w-4" />
            Bio Links
          </h3>
          <div className="space-y-1">
            {externalUrls.map((link, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{link.title || link.link_type}:</span>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {link.url}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
