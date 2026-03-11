import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TikTokMetadata } from '../types';

interface TikTokFieldsProps {
  metadata: TikTokMetadata;
  onChange: (metadata: TikTokMetadata) => void;
}

export function TikTokFields({ metadata, onChange }: TikTokFieldsProps) {
  const handleChange = (field: keyof TikTokMetadata, value: string | number) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="post_author">Video Creator</Label>
          <Input
            id="post_author"
            placeholder="@creator"
            value={metadata.post_author || ''}
            onChange={(e) => handleChange('post_author', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comment_thread_position">Comment Position</Label>
          <Input
            id="comment_thread_position"
            type="number"
            placeholder="1"
            min={1}
            value={metadata.comment_thread_position || ''}
            onChange={(e) => handleChange('comment_thread_position', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="video_topic">Video Topic</Label>
        <Input
          id="video_topic"
          placeholder="Tech tips, Life hacks, etc."
          value={metadata.video_topic || ''}
          onChange={(e) => handleChange('video_topic', e.target.value)}
        />
      </div>
    </div>
  );
}
