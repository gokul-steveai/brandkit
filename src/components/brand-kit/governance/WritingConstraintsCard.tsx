import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Ruler, AlertCircle } from 'lucide-react';

export interface WritingConstraint {
  id: string;
  type: 'character_limit' | 'emoji_limit' | 'punctuation' | 'formatting' | 'custom';
  rule: string;
  value?: string | number;
  platform?: string;
  isHard: boolean; // Hard constraint vs soft guideline
}

export interface WritingConstraints {
  constraints: WritingConstraint[];
  platformSpecificEnabled: boolean;
}

interface WritingConstraintsCardProps {
  writingConstraints: WritingConstraints;
  onChange: (constraints: WritingConstraints) => void;
}

const CONSTRAINT_TYPES = [
  { value: 'character_limit', label: 'Character Limit' },
  { value: 'emoji_limit', label: 'Emoji Limit' },
  { value: 'punctuation', label: 'Punctuation Rule' },
  { value: 'formatting', label: 'Formatting Rule' },
  { value: 'custom', label: 'Custom Rule' },
];

const PLATFORMS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
  { value: 'blog', label: 'Blog' },
];

const PRESET_CONSTRAINTS: Partial<WritingConstraint>[] = [
  { type: 'character_limit', rule: 'Maximum caption length', value: '2200', platform: 'instagram', isHard: true },
  { type: 'character_limit', rule: 'Maximum post length', value: '280', platform: 'twitter', isHard: true },
  { type: 'emoji_limit', rule: 'Maximum emojis per post', value: '3', isHard: false },
  { type: 'punctuation', rule: 'No excessive exclamation marks (max 1)', isHard: false },
  { type: 'formatting', rule: 'No ALL CAPS text', isHard: true },
  { type: 'custom', rule: 'Always end with a call-to-action', isHard: false },
];

export function WritingConstraintsCard({ writingConstraints, onChange }: WritingConstraintsCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newConstraint, setNewConstraint] = useState<Partial<WritingConstraint>>({
    type: 'custom',
    rule: '',
    value: '',
    platform: 'all',
    isHard: false,
  });

  const addConstraint = () => {
    if (newConstraint.rule?.trim()) {
      const constraint: WritingConstraint = {
        id: crypto.randomUUID(),
        type: newConstraint.type || 'custom',
        rule: newConstraint.rule.trim(),
        value: newConstraint.value,
        platform: newConstraint.platform === 'all' ? undefined : newConstraint.platform,
        isHard: newConstraint.isHard || false,
      };
      onChange({
        ...writingConstraints,
        constraints: [...writingConstraints.constraints, constraint],
      });
      setNewConstraint({ type: 'custom', rule: '', value: '', platform: 'all', isHard: false });
      setIsAdding(false);
    }
  };

  const removeConstraint = (id: string) => {
    onChange({
      ...writingConstraints,
      constraints: writingConstraints.constraints.filter(c => c.id !== id),
    });
  };

  const addFromPreset = (preset: Partial<WritingConstraint>) => {
    const exists = writingConstraints.constraints.some(
      c => c.rule.toLowerCase() === preset.rule?.toLowerCase() && c.platform === preset.platform
    );
    if (!exists && preset.rule) {
      const constraint: WritingConstraint = {
        id: crypto.randomUUID(),
        type: preset.type || 'custom',
        rule: preset.rule,
        value: preset.value?.toString(),
        platform: preset.platform,
        isHard: preset.isHard || false,
      };
      onChange({
        ...writingConstraints,
        constraints: [...writingConstraints.constraints, constraint],
      });
    }
  };

  const getTypeColor = (type: WritingConstraint['type']) => {
    switch (type) {
      case 'character_limit': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'emoji_limit': return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
      case 'punctuation': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
      case 'formatting': return 'bg-green-500/10 text-green-700 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Writing Constraints</CardTitle>
        </div>
        <CardDescription>
          Define hard limits and rules for AI-generated content. Hard constraints are enforced strictly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform-specific toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Platform-Specific Rules</Label>
            <p className="text-xs text-muted-foreground">Apply different constraints per platform</p>
          </div>
          <Switch
            checked={writingConstraints.platformSpecificEnabled}
            onCheckedChange={(checked) => onChange({ ...writingConstraints, platformSpecificEnabled: checked })}
          />
        </div>

        {/* Quick Add Presets */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quick Add</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_CONSTRAINTS.map((preset, i) => {
              const exists = writingConstraints.constraints.some(
                c => c.rule.toLowerCase() === preset.rule?.toLowerCase()
              );
              return (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => addFromPreset(preset)}
                  disabled={exists}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {preset.rule?.substring(0, 30)}{preset.rule && preset.rule.length > 30 ? '...' : ''}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Existing Constraints */}
        <div className="space-y-2">
          {writingConstraints.constraints.map((constraint) => (
            <div
              key={constraint.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                constraint.isHard ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30'
              }`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${getTypeColor(constraint.type)}`}>
                    {CONSTRAINT_TYPES.find(t => t.value === constraint.type)?.label}
                  </Badge>
                  {constraint.isHard && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Hard
                    </Badge>
                  )}
                  {constraint.platform && (
                    <Badge variant="secondary" className="text-xs">
                      {PLATFORMS.find(p => p.value === constraint.platform)?.label}
                    </Badge>
                  )}
                </div>
                <p className="text-sm">
                  {constraint.rule}
                  {constraint.value && <span className="text-primary font-medium ml-1">({constraint.value})</span>}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeConstraint(constraint.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Constraint Form */}
        {isAdding ? (
          <div className="p-4 rounded-lg border border-dashed space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Type</Label>
                <Select
                  value={newConstraint.type}
                  onValueChange={(value) => setNewConstraint(prev => ({ ...prev, type: value as WritingConstraint['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRAINT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {writingConstraints.platformSpecificEnabled && (
                <div>
                  <Label className="text-sm">Platform</Label>
                  <Select
                    value={newConstraint.platform || 'all'}
                    onValueChange={(value) => setNewConstraint(prev => ({ ...prev, platform: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Rule Description *</Label>
                <Input
                  placeholder="e.g., Maximum hashtags per post"
                  value={newConstraint.rule || ''}
                  onChange={(e) => setNewConstraint(prev => ({ ...prev, rule: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm">Value (optional)</Label>
                <Input
                  placeholder="e.g., 5"
                  value={newConstraint.value?.toString() || ''}
                  onChange={(e) => setNewConstraint(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newConstraint.isHard || false}
                onCheckedChange={(checked) => setNewConstraint(prev => ({ ...prev, isHard: checked }))}
              />
              <Label className="text-sm">Hard constraint (must be enforced)</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={addConstraint} disabled={!newConstraint.rule?.trim()}>
                Add Constraint
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Constraint
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
