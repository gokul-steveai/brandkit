import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ShieldAlert, Lightbulb } from 'lucide-react';

export interface DriftPreventionPrompt {
  id: string;
  prompt: string;
  category: 'tone' | 'content' | 'style' | 'ethics' | 'custom';
  source?: 'manual' | 'report' | 'anti_archetype';
}

interface DriftPreventionCardProps {
  prompts: DriftPreventionPrompt[];
  onChange: (prompts: DriftPreventionPrompt[]) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'tone', label: 'Tone', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'content', label: 'Content', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { value: 'style', label: 'Style', color: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  { value: 'ethics', label: 'Ethics', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  { value: 'custom', label: 'Custom', color: 'bg-muted text-muted-foreground' },
];

const PRESET_PROMPTS: Partial<DriftPreventionPrompt>[] = [
  { category: 'tone', prompt: 'Never produce text that sounds overly salesy or pushy' },
  { category: 'tone', prompt: 'Never produce text that is condescending or patronizing' },
  { category: 'content', prompt: 'Never produce text that makes unverified claims or promises' },
  { category: 'content', prompt: 'Never produce text that compares us negatively to competitors' },
  { category: 'style', prompt: 'Never produce text that uses excessive jargon or buzzwords' },
  { category: 'style', prompt: 'Never produce text with multiple exclamation marks' },
  { category: 'ethics', prompt: 'Never produce text that could be seen as manipulative' },
  { category: 'ethics', prompt: 'Never produce text that makes false urgency claims' },
];

export function DriftPreventionCard({ prompts, onChange }: DriftPreventionCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrompt, setNewPrompt] = useState<Partial<DriftPreventionPrompt>>({
    prompt: '',
    category: 'custom',
  });

  const addPrompt = () => {
    if (newPrompt.prompt?.trim()) {
      const prompt: DriftPreventionPrompt = {
        id: crypto.randomUUID(),
        prompt: newPrompt.prompt.trim(),
        category: newPrompt.category || 'custom',
        source: 'manual',
      };
      onChange([...prompts, prompt]);
      setNewPrompt({ prompt: '', category: 'custom' });
      setIsAdding(false);
    }
  };

  const removePrompt = (id: string) => {
    onChange(prompts.filter(p => p.id !== id));
  };

  const addFromPreset = (preset: Partial<DriftPreventionPrompt>) => {
    const exists = prompts.some(p => p.prompt.toLowerCase() === preset.prompt?.toLowerCase());
    if (!exists && preset.prompt) {
      const prompt: DriftPreventionPrompt = {
        id: crypto.randomUUID(),
        prompt: preset.prompt,
        category: preset.category || 'custom',
        source: 'manual',
      };
      onChange([...prompts, prompt]);
    }
  };

  const getCategoryStyle = (category: DriftPreventionPrompt['category']) => {
    return CATEGORY_OPTIONS.find(c => c.value === category)?.color || '';
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'report': return 'From Report';
      case 'anti_archetype': return 'Anti-Archetype';
      default: return null;
    }
  };

  // Group prompts by category
  const groupedPrompts = CATEGORY_OPTIONS.reduce((acc, cat) => {
    acc[cat.value] = prompts.filter(p => p.category === cat.value);
    return acc;
  }, {} as Record<string, DriftPreventionPrompt[]>);

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">Drift Prevention</CardTitle>
        </div>
        <CardDescription>
          Negative prompts that tell AI what to avoid. These help prevent off-brand content generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info callout */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-primary">How it works</p>
            <p className="text-muted-foreground">
              These prompts are prepended to AI generation requests as "Never produce text that..." instructions.
            </p>
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quick Add</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_PROMPTS.slice(0, 4).map((preset, i) => {
              const exists = prompts.some(p => p.prompt.toLowerCase() === preset.prompt?.toLowerCase());
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
                  {preset.prompt?.substring(0, 35)}{preset.prompt && preset.prompt.length > 35 ? '...' : ''}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Grouped Prompts by Category */}
        <div className="space-y-4">
          {CATEGORY_OPTIONS.map((category) => {
            const categoryPrompts = groupedPrompts[category.value] || [];
            if (categoryPrompts.length === 0) return null;
            
            return (
              <div key={category.value} className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${category.color}`}>
                    {category.label}
                  </Badge>
                  <span className="text-muted-foreground font-normal">
                    ({categoryPrompts.length})
                  </span>
                </Label>
                <div className="space-y-2">
                  {categoryPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 group"
                    >
                      <span className="text-destructive mt-0.5 text-sm font-medium shrink-0">✕</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">Never produce text that {prompt.prompt.toLowerCase().replace(/^never produce text that\s*/i, '')}</p>
                        {prompt.source && prompt.source !== 'manual' && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {getSourceLabel(prompt.source)}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => removePrompt(prompt.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {prompts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No drift prevention prompts yet</p>
            <p className="text-xs">Add prompts to prevent off-brand AI content</p>
          </div>
        )}

        {/* Add New Prompt Form */}
        {isAdding ? (
          <div className="p-4 rounded-lg border border-dashed space-y-4">
            <div>
              <Label className="text-sm">Category</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={newPrompt.category === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPrompt(prev => ({ ...prev, category: cat.value as DriftPreventionPrompt['category'] }))}
                    className="text-xs"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm">Never produce text that... *</Label>
              <Textarea
                placeholder="e.g., sounds desperate or needy"
                value={newPrompt.prompt || ''}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={addPrompt} disabled={!newPrompt.prompt?.trim()}>
                Add Prompt
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Drift Prevention Prompt
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
