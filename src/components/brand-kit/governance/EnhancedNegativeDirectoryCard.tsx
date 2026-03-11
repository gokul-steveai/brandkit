import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, X, Ban, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export interface NegativeDirectoryItem {
  id: string;
  term: string;
  category: 'marketing_speak' | 'pretentious' | 'sales_language' | 'jargon' | 'offensive' | 'other';
  source: 'manual' | 'report' | 'import';
  platformContext?: string;
  reason?: string;
}

interface EnhancedNegativeDirectoryCardProps {
  items: NegativeDirectoryItem[];
  onChange: (items: NegativeDirectoryItem[]) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'marketing_speak', label: 'Marketing Speak', color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  { value: 'pretentious', label: 'Pretentious Terms', color: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  { value: 'sales_language', label: 'Sales Language', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
  { value: 'jargon', label: 'Jargon', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'offensive', label: 'Offensive', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { value: 'other', label: 'Other', color: 'bg-muted text-muted-foreground' },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
];

const PRESET_TERMS: Partial<NegativeDirectoryItem>[] = [
  { term: 'synergy', category: 'marketing_speak', reason: 'Overused corporate buzzword' },
  { term: 'leverage', category: 'marketing_speak', reason: 'Often sounds inauthentic' },
  { term: 'best-in-class', category: 'pretentious', reason: 'Unsubstantiated claim' },
  { term: 'world-class', category: 'pretentious', reason: 'Overused and vague' },
  { term: 'limited time offer', category: 'sales_language', reason: 'Creates false urgency' },
  { term: 'act now', category: 'sales_language', reason: 'Pushy sales language' },
  { term: 'disrupt', category: 'jargon', reason: 'Tech startup cliché' },
  { term: 'pivot', category: 'jargon', reason: 'Overused startup term' },
];

export function EnhancedNegativeDirectoryCard({ items, onChange }: EnhancedNegativeDirectoryCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['marketing_speak', 'pretentious', 'sales_language']);
  const [newItem, setNewItem] = useState<Partial<NegativeDirectoryItem>>({
    term: '',
    category: 'other',
    platformContext: 'all',
    reason: '',
  });

  const addItem = () => {
    if (newItem.term?.trim()) {
      const item: NegativeDirectoryItem = {
        id: crypto.randomUUID(),
        term: newItem.term.trim(),
        category: newItem.category || 'other',
        source: 'manual',
        platformContext: newItem.platformContext === 'all' ? undefined : newItem.platformContext,
        reason: newItem.reason?.trim() || undefined,
      };
      onChange([...items, item]);
      setNewItem({ term: '', category: 'other', platformContext: 'all', reason: '' });
      setIsAdding(false);
    }
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const addFromPreset = (preset: Partial<NegativeDirectoryItem>) => {
    const exists = items.some(i => i.term?.toLowerCase() === preset.term?.toLowerCase());
    if (!exists && preset.term) {
      const item: NegativeDirectoryItem = {
        id: crypto.randomUUID(),
        term: preset.term,
        category: preset.category || 'other',
        source: 'manual',
        reason: preset.reason,
      };
      onChange([...items, item]);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getCategoryStyle = (category: NegativeDirectoryItem['category']) => {
    return CATEGORY_OPTIONS.find(c => c.value === category)?.color || '';
  };

  const getSourceLabel = (source: NegativeDirectoryItem['source']) => {
    switch (source) {
      case 'report': return 'From Report';
      case 'import': return 'Imported';
      default: return null;
    }
  };

  // Group and filter items
  const filteredItems = filterCategory === 'all' 
    ? items 
    : items.filter(i => i.category === filterCategory);

  const groupedItems = CATEGORY_OPTIONS.reduce((acc, cat) => {
    acc[cat.value] = filteredItems.filter(i => i.category === cat.value);
    return acc;
  }, {} as Record<string, NegativeDirectoryItem[]>);

  return (
    <Card className="border-2 border-border md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Negative Directory</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          Words, phrases, and patterns your brand should never use. Grouped by category for easy management.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Add Presets */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quick Add Common Terms</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TERMS.slice(0, 6).map((preset, i) => {
              const exists = items.some(item => item.term?.toLowerCase() === preset.term?.toLowerCase());
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
                  "{preset.term}"
                </Button>
              );
            })}
          </div>
        </div>

        {/* Grouped Items by Category */}
        <div className="space-y-3">
          {CATEGORY_OPTIONS.map((category) => {
            const categoryItems = groupedItems[category.value] || [];
            if (categoryItems.length === 0 && filterCategory !== 'all') return null;
            const isExpanded = expandedCategories.includes(category.value);
            
            return (
              <Collapsible key={category.value} open={isExpanded} onOpenChange={() => toggleCategory(category.value)}>
                <CollapsibleTrigger asChild>
                  <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                    categoryItems.length > 0 ? 'bg-muted/30' : 'bg-muted/10'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${category.color}`}>
                        {category.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {categoryItems.length} {categoryItems.length === 1 ? 'term' : 'terms'}
                      </span>
                    </div>
                    {categoryItems.length > 0 && (
                      isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2 pl-2 space-y-1">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded border bg-background group"
                      >
                        <span className="text-destructive text-sm">✕</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">"{item.term}"</span>
                          {item.reason && (
                            <span className="text-xs text-muted-foreground ml-2">— {item.reason}</span>
                          )}
                          <div className="flex gap-1 mt-1">
                            {item.platformContext && (
                              <Badge variant="secondary" className="text-xs">
                                {PLATFORM_OPTIONS.find(p => p.value === item.platformContext)?.label}
                              </Badge>
                            )}
                            {item.source !== 'manual' && (
                              <Badge variant="outline" className="text-xs">
                                {getSourceLabel(item.source)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No banned terms yet</p>
            <p className="text-xs">Add words and phrases your brand should avoid</p>
          </div>
        )}

        {/* Add New Item Form */}
        {isAdding ? (
          <div className="p-4 rounded-lg border border-dashed space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Term or Phrase *</Label>
                <Input
                  placeholder="e.g., synergy, best-in-class"
                  value={newItem.term || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, term: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value as NegativeDirectoryItem['category'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Platform Context</Label>
                <Select
                  value={newItem.platformContext || 'all'}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, platformContext: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Reason (optional)</Label>
                <Input
                  placeholder="Why should this be avoided?"
                  value={newItem.reason || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={addItem} disabled={!newItem.term?.trim()}>
                Add Term
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Banned Term
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
