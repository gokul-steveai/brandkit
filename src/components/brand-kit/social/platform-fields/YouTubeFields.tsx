import { Users, Eye, Video, CheckCircle, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SocialProfile } from '../types';

interface YouTubeFieldsProps {
  formData: Partial<SocialProfile>;
  onChange: (data: Partial<SocialProfile>) => void;
}

export function YouTubeFields({ formData, onChange }: YouTubeFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Channel Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="channelName">Channel Name</Label>
          <Input
            id="channelName"
            value={formData.first_name || ''}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value })}
            className="border-2"
          />
        </div>
        <div>
          <Label htmlFor="handle">Handle</Label>
          <Input
            id="handle"
            value={formData.username || ''}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            className="border-2"
            placeholder="@handle"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
        {formData.subscriber_count !== undefined && formData.subscriber_count !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.subscriber_count.toLocaleString()} subscribers</span>
          </div>
        )}
        {formData.video_count !== undefined && formData.video_count !== null && (
          <div className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            <span>{formData.video_count.toLocaleString()} videos</span>
          </div>
        )}
        {formData.view_count !== undefined && formData.view_count !== null && (
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{Number(formData.view_count).toLocaleString()} views</span>
          </div>
        )}
        {formData.verified && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>

      {/* Joined Date */}
      {formData.joined_date && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Joined {formData.joined_date}</span>
        </div>
      )}

      <Separator />

      {/* Description */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Channel Description</h3>
        <Textarea
          value={formData.about || ''}
          onChange={(e) => onChange({ ...formData, about: e.target.value })}
          className="border-2 min-h-[150px]"
          placeholder="Channel description..."
        />
      </div>
    </div>
  );
}
