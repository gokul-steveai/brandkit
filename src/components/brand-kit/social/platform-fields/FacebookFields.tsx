import { Users, ThumbsUp, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';
import type { SocialProfile } from '../types';

interface FacebookFieldsProps {
  formData: Partial<SocialProfile>;
  onChange: (data: Partial<SocialProfile>) => void;
}

export function FacebookFields({ formData, onChange }: FacebookFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.first_name || ''}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value })}
            className="border-2"
          />
        </div>
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
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
        {formData.followers !== undefined && formData.followers !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.followers.toLocaleString()} followers</span>
          </div>
        )}
        {formData.friend_count !== undefined && formData.friend_count !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.friend_count.toLocaleString()} friends</span>
          </div>
        )}
        {formData.likes_count !== undefined && formData.likes_count !== null && (
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" />
            <span>{formData.likes_count.toLocaleString()} likes</span>
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

      {/* Category */}
      {formData.category && (
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category || ''}
            onChange={(e) => onChange({ ...formData, category: e.target.value })}
            className="border-2"
          />
        </div>
      )}

      {/* About */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">About</h3>
        <Textarea
          value={formData.about || ''}
          onChange={(e) => onChange({ ...formData, about: e.target.value })}
          className="border-2 min-h-[120px]"
          placeholder="About this profile..."
        />
      </div>

      <Separator />

      {/* Website */}
      <div>
        <Label htmlFor="website" className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          Website
        </Label>
        <Input
          id="website"
          value={formData.external_url || formData.company_website || ''}
          onChange={(e) => onChange({ ...formData, external_url: e.target.value, company_website: e.target.value })}
          className="border-2"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
