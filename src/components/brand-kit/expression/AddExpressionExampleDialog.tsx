import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  EXPRESSION_PLATFORMS,
  PLATFORM_CONTEXT_TYPES,
  PLATFORM_INFO,
  CONTEXT_TYPE_LABELS,
  type ExpressionPlatform,
  type ContextType,
  type PlatformMetadata,
  type ExpressionExampleFormData,
} from './types';
import {
  RedditFields,
  LinkedInFields,
  InstagramFields,
  FacebookFields,
  TikTokFields,
  YouTubeFields,
  TwitterFields,
  EmailFields,
  ChatFields,
} from './platform-fields';

interface AddExpressionExampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpressionExampleFormData) => Promise<void>;
  initialData?: ExpressionExampleFormData;
  isEditing?: boolean;
}

export function AddExpressionExampleDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}: AddExpressionExampleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExpressionExampleFormData>(
    initialData || {
      platform: 'linkedin',
      context_type: 'comment',
      original_content: '',
      user_response: '',
      platform_metadata: {},
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_response.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      // Reset form
      setFormData({
        platform: 'linkedin',
        context_type: 'comment',
        original_content: '',
        user_response: '',
        platform_metadata: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlatformChange = (platform: ExpressionPlatform) => {
    const validContextTypes = PLATFORM_CONTEXT_TYPES[platform];
    const newContextType = validContextTypes.includes(formData.context_type)
      ? formData.context_type
      : validContextTypes[0];

    setFormData((prev) => ({
      ...prev,
      platform,
      context_type: newContextType,
      platform_metadata: {},
    }));
  };

  const handleMetadataChange = (metadata: PlatformMetadata) => {
    setFormData((prev) => ({
      ...prev,
      platform_metadata: metadata,
    }));
  };

  const renderPlatformFields = () => {
    const metadata = formData.platform_metadata as Record<string, unknown>;

    switch (formData.platform) {
      case 'reddit':
        return <RedditFields metadata={metadata} onChange={handleMetadataChange} contextType={formData.context_type} />;
      case 'linkedin':
        return <LinkedInFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'instagram':
        return <InstagramFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'facebook':
        return <FacebookFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'tiktok':
        return <TikTokFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'youtube':
        return <YouTubeFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'twitter':
        return <TwitterFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'email':
        return <EmailFields metadata={metadata} onChange={handleMetadataChange} />;
      case 'chat':
        return <ChatFields metadata={metadata} onChange={handleMetadataChange} />;
      default:
        return null;
    }
  };

  // Get available context types for the selected platform
  const availableContextTypes = PLATFORM_CONTEXT_TYPES[formData.platform];

  // Check if we should hide the "Original Content" field (Reddit post = original content)
  const hideOriginalContent = formData.platform === 'reddit' && formData.context_type === 'post';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expression Example' : 'Add Expression Example'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this example of how you communicate on this platform.'
              : 'Add an example of how you communicate on various platforms. This helps train AI to match your brand voice.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform and Context Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => handlePlatformChange(value as ExpressionPlatform)}
              >
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPRESSION_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {PLATFORM_INFO[platform].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="context_type">Context Type</Label>
              <Select
                value={formData.context_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, context_type: value as ContextType }))
                }
              >
                <SelectTrigger id="context_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableContextTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTEXT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Platform-specific fields */}
          {formData.platform !== 'other' && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-4">
                {PLATFORM_INFO[formData.platform].label} Details (optional)
              </h4>
              {renderPlatformFields()}
            </div>
          )}

          {/* Original Content - hide for Reddit posts since they are original content */}
          {!hideOriginalContent && (
            <div className="space-y-2">
              <Label htmlFor="original_content">Original Content (what you were responding to)</Label>
              <Textarea
                id="original_content"
                placeholder="Paste the original post, comment, or message you were responding to..."
                value={formData.original_content}
                onChange={(e) => setFormData((prev) => ({ ...prev, original_content: e.target.value }))}
                rows={3}
              />
            </div>
          )}

          {/* User Response */}
          <div className="space-y-2">
            <Label htmlFor="user_response">
              {formData.platform === 'reddit' && formData.context_type === 'post' ? 'Your Post Content' : 'Your Response'} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="user_response"
              placeholder={formData.platform === 'reddit' && formData.context_type === 'post' ? 'Your post content...' : 'Your actual response or comment...'}
              value={formData.user_response}
              onChange={(e) => setFormData((prev) => ({ ...prev, user_response: e.target.value }))}
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              This is the example of your brand voice that will be used for training.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.user_response.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Example' : 'Add Example'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
