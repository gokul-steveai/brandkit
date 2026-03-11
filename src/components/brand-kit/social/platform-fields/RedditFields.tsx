import { Award, CheckCircle, Cake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SocialProfile } from '../types';

interface RedditFieldsProps {
  formData: Partial<SocialProfile>;
  onChange: (data: Partial<SocialProfile>) => void;
}

export function RedditFields({ formData, onChange }: RedditFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username || ''}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            className="border-2"
            placeholder="u/username"
          />
        </div>
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.first_name || ''}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value })}
            className="border-2"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
        {formData.karma !== undefined && formData.karma !== null && (
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            <span>{formData.karma.toLocaleString()} karma</span>
          </div>
        )}
        {formData.post_karma !== undefined && formData.post_karma !== null && (
          <div className="flex items-center gap-1">
            <span>{formData.post_karma.toLocaleString()} post karma</span>
          </div>
        )}
        {formData.comment_karma !== undefined && formData.comment_karma !== null && (
          <div className="flex items-center gap-1">
            <span>{formData.comment_karma.toLocaleString()} comment karma</span>
          </div>
        )}
        {formData.verified && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>

      {/* Cake Day */}
      {formData.cake_day && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cake className="h-4 w-4" />
          <span>Cake Day: {formData.cake_day}</span>
        </div>
      )}

      <Separator />

      {/* Bio */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Bio</h3>
        <Textarea
          value={formData.biography || formData.about || ''}
          onChange={(e) => onChange({ ...formData, biography: e.target.value, about: e.target.value })}
          className="border-2 min-h-[120px]"
          placeholder="Profile bio..."
        />
      </div>
    </div>
  );
}
