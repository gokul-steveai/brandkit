import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RedditMetadata, ContextType } from '../types';

interface RedditFieldsProps {
  metadata: RedditMetadata;
  onChange: (metadata: RedditMetadata) => void;
  contextType?: ContextType;
}

export function RedditFields({ metadata, onChange, contextType }: RedditFieldsProps) {
  const handleChange = (field: keyof RedditMetadata, value: string) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subreddit">Subreddit</Label>
          <Input
            id="subreddit"
            placeholder="r/programming"
            value={metadata.subreddit || ''}
            onChange={(e) => handleChange('subreddit', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="post_author">Post Author</Label>
          <Input
            id="post_author"
            placeholder="u/username"
            value={metadata.post_author || ''}
            onChange={(e) => handleChange('post_author', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="post_title">Post Title</Label>
        <Input
          id="post_title"
          placeholder="Original post title..."
          value={metadata.post_title || ''}
          onChange={(e) => handleChange('post_title', e.target.value)}
        />
      </div>
      {/* Hide Parent Comment for 'post' context type */}
      {contextType !== 'post' && (
        <div className="space-y-2">
          <Label htmlFor="parent_comment">Parent Comment (if replying to a comment)</Label>
          <Textarea
            id="parent_comment"
            placeholder="The comment you were responding to..."
            value={metadata.parent_comment || ''}
            onChange={(e) => handleChange('parent_comment', e.target.value)}
            rows={2}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="post_url">Post URL (optional)</Label>
        <Input
          id="post_url"
          placeholder="https://reddit.com/..."
          value={metadata.post_url || ''}
          onChange={(e) => handleChange('post_url', e.target.value)}
        />
      </div>
    </div>
  );
}
