import { Users, Heart, Video, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SocialProfile } from '../types';

interface TikTokFieldsProps {
  formData: Partial<SocialProfile>;
  onChange: (data: Partial<SocialProfile>) => void;
}

export function TikTokFields({ formData, onChange }: TikTokFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <Label htmlFor="nickname">Nickname / Display Name</Label>
          <Input
            id="nickname"
            value={formData.first_name || ''}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value })}
            className="border-2"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
        {formData.followers !== undefined && formData.followers !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.followers.toLocaleString()} followers</span>
          </div>
        )}
        {formData.following_count !== undefined && formData.following_count !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.following_count.toLocaleString()} following</span>
          </div>
        )}
        {formData.likes_count !== undefined && formData.likes_count !== null && (
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span>{formData.likes_count.toLocaleString()} likes</span>
          </div>
        )}
        {formData.video_count !== undefined && formData.video_count !== null && (
          <div className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            <span>{formData.video_count.toLocaleString()} videos</span>
          </div>
        )}
        {formData.verified && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>

      <Separator />

      {/* Bio */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Bio</h3>
        <Textarea
          value={formData.biography || formData.about || ''}
          onChange={(e) => onChange({ ...formData, biography: e.target.value, about: e.target.value })}
          className="border-2 min-h-[120px]"
          placeholder="Profile bio..."
        />
      </div>
    </div>
  );
}
