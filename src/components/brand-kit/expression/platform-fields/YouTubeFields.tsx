import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { YouTubeMetadata } from '../types';

interface YouTubeFieldsProps {
  metadata: YouTubeMetadata;
  onChange: (metadata: YouTubeMetadata) => void;
}

export function YouTubeFields({ metadata, onChange }: YouTubeFieldsProps) {
  const handleChange = (field: keyof YouTubeMetadata, value: string) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="channel_name">Channel Name</Label>
          <Input
            id="channel_name"
            placeholder="TechChannel"
            value={metadata.channel_name || ''}
            onChange={(e) => handleChange('channel_name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comment_type">Comment Type</Label>
          <Select
            value={metadata.comment_type || ''}
            onValueChange={(value) => handleChange('comment_type', value)}
          >
            <SelectTrigger id="comment_type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comment">Top-level Comment</SelectItem>
              <SelectItem value="reply">Reply to Comment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="video_title">Video Title</Label>
        <Input
          id="video_title"
          placeholder="How to..."
          value={metadata.video_title || ''}
          onChange={(e) => handleChange('video_title', e.target.value)}
        />
      </div>
    </div>
  );
}
