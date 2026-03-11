import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InstagramMetadata } from '../types';

interface InstagramFieldsProps {
  metadata: InstagramMetadata;
  onChange: (metadata: InstagramMetadata) => void;
}

export function InstagramFields({ metadata, onChange }: InstagramFieldsProps) {
  const handleChange = (field: keyof InstagramMetadata, value: string | string[]) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="post_author">Post Author</Label>
          <Input
            id="post_author"
            placeholder="@username"
            value={metadata.post_author || ''}
            onChange={(e) => handleChange('post_author', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="post_type">Post Type</Label>
          <Select
            value={metadata.post_type || ''}
            onValueChange={(value) => handleChange('post_type', value as 'reel' | 'post' | 'story')}
          >
            <SelectTrigger id="post_type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="reel">Reel</SelectItem>
              <SelectItem value="story">Story</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hashtags">Hashtags (comma-separated)</Label>
        <Input
          id="hashtags"
          placeholder="#tech, #startup, #design"
          value={metadata.hashtags?.join(', ') || ''}
          onChange={(e) => {
            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
            handleChange('hashtags', tags);
          }}
        />
      </div>
    </div>
  );
}
