import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LinkedInMetadata } from '../types';

interface LinkedInFieldsProps {
  metadata: LinkedInMetadata;
  onChange: (metadata: LinkedInMetadata) => void;
}

export function LinkedInFields({ metadata, onChange }: LinkedInFieldsProps) {
  const handleChange = (field: keyof LinkedInMetadata, value: string | number) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="post_author">Post Author</Label>
          <Input
            id="post_author"
            placeholder="John Smith"
            value={metadata.post_author || ''}
            onChange={(e) => handleChange('post_author', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            placeholder="Acme Corp"
            value={metadata.company || ''}
            onChange={(e) => handleChange('company', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="post_type">Post Type</Label>
          <Select
            value={metadata.post_type || ''}
            onValueChange={(value) => handleChange('post_type', value)}
          >
            <SelectTrigger id="post_type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="poll">Poll</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="connection_degree">Connection Degree</Label>
          <Select
            value={metadata.connection_degree?.toString() || ''}
            onValueChange={(value) => handleChange('connection_degree', parseInt(value))}
          >
            <SelectTrigger id="connection_degree">
              <SelectValue placeholder="Select degree" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st</SelectItem>
              <SelectItem value="2">2nd</SelectItem>
              <SelectItem value="3">3rd+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="engagement_context">Engagement Context</Label>
        <Select
          value={metadata.engagement_context || ''}
          onValueChange={(value) => handleChange('engagement_context', value)}
        >
          <SelectTrigger id="engagement_context">
            <SelectValue placeholder="Select context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comment_on_post">Comment on Post</SelectItem>
            <SelectItem value="reply_to_comment">Reply to Comment</SelectItem>
            <SelectItem value="direct_message">Direct Message</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
