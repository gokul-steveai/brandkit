import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FacebookMetadata } from '../types';

interface FacebookFieldsProps {
  metadata: FacebookMetadata;
  onChange: (metadata: FacebookMetadata) => void;
}

export function FacebookFields({ metadata, onChange }: FacebookFieldsProps) {
  const handleChange = (field: keyof FacebookMetadata, value: string) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="post_author">Post Author</Label>
          <Input
            id="post_author"
            placeholder="Jane Doe"
            value={metadata.post_author || ''}
            onChange={(e) => handleChange('post_author', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="post_type">Post Type</Label>
          <Select
            value={metadata.post_type || ''}
            onValueChange={(value) => handleChange('post_type', value as FacebookMetadata['post_type'])}
          >
            <SelectTrigger id="post_type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group_post">Group Post</SelectItem>
              <SelectItem value="page_post">Page Post</SelectItem>
              <SelectItem value="personal_post">Personal Post</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="group_name">Group/Page Name (if applicable)</Label>
        <Input
          id="group_name"
          placeholder="Tech Professionals"
          value={metadata.group_name || ''}
          onChange={(e) => handleChange('group_name', e.target.value)}
        />
      </div>
    </div>
  );
}
