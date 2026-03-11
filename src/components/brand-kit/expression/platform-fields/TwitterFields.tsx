import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { TwitterMetadata } from '../types';

interface TwitterFieldsProps {
  metadata: TwitterMetadata;
  onChange: (metadata: TwitterMetadata) => void;
}

export function TwitterFields({ metadata, onChange }: TwitterFieldsProps) {
  const handleChange = (field: keyof TwitterMetadata, value: string | number | boolean) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tweet_author">Tweet Author</Label>
          <Input
            id="tweet_author"
            placeholder="@username"
            value={metadata.tweet_author || ''}
            onChange={(e) => handleChange('tweet_author', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thread_position">Thread Position</Label>
          <Input
            id="thread_position"
            type="number"
            placeholder="1"
            min={1}
            value={metadata.thread_position || ''}
            onChange={(e) => handleChange('thread_position', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_quote_tweet"
          checked={metadata.is_quote_tweet || false}
          onCheckedChange={(checked) => handleChange('is_quote_tweet', checked as boolean)}
        />
        <Label htmlFor="is_quote_tweet" className="cursor-pointer">
          This is a quote tweet
        </Label>
      </div>
    </div>
  );
}
