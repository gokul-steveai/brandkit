import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  X, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Package,
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Image,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ContentCategory {
  name: string;
  description: string;
  typicalStructure: string;
  toneShift: string;
  keyPhrases: string[];
  lengthGuidance: string;
}

interface ContentCategoriesCardProps {
  categories: ContentCategory[];
  onChange: (categories: ContentCategory[]) => void;
}

const CATEGORY_PRESETS: Partial<ContentCategory>[] = [
  { name: 'Product Showcase', description: 'Highlighting products and craftsmanship' },
  { name: 'For Sale', description: 'Items available for purchase' },
  { name: 'Personal Story', description: 'Behind-the-scenes and personal moments' },
  { name: 'Availability Update', description: 'Stock and availability announcements' },
  { name: 'Educational', description: 'Teaching and informing the audience' },
  { name: 'Community', description: 'Engaging with followers and building connection' },
];

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('product') || lower.includes('showcase')) return Package;
  if (lower.includes('sale') || lower.includes('price')) return DollarSign;
  if (lower.includes('personal') || lower.includes('story')) return User;
  if (lower.includes('availab') || lower.includes('stock')) return Calendar;
  if (lower.includes('community') || lower.includes('engage')) return MessageSquare;
  return Image;
};

const emptyCategory: ContentCategory = {
  name: '',
  description: '',
  typicalStructure: '',
  toneShift: '',
  keyPhrases: [],
  lengthGuidance: '',
};

export function ContentCategoriesCard({ categories, onChange }: ContentCategoriesCardProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<ContentCategory>({ ...emptyCategory });

  const addCategory = () => {
    if (newCategory.name.trim()) {
      onChange([...categories, newCategory]);
      setNewCategory({ ...emptyCategory });
      setIsAdding(false);
    }
  };

  const updateCategory = (index: number, updates: Partial<ContentCategory>) => {
    onChange(
      categories.map((cat, i) => (i === index ? { ...cat, ...updates } : cat))
    );
  };

  const removeCategory = (index: number) => {
    onChange(categories.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const addFromPreset = (preset: Partial<ContentCategory>) => {
    const exists = categories.some(c => c.name.toLowerCase() === preset.name?.toLowerCase());
    if (!exists && preset.name) {
      onChange([...categories, { ...emptyCategory, ...preset }]);
    }
  };

  return (
    <Card className="border-2 border-border md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Content Categories</CardTitle>
        </div>
        <CardDescription>
          Define templates for different types of content. Each category can have its own structure and tone adjustments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Add Presets */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quick Add</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PRESETS.map((preset) => {
              const exists = categories.some(c => c.name.toLowerCase() === preset.name?.toLowerCase());
              return (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => addFromPreset(preset)}
                  disabled={exists}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {preset.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Existing Categories */}
        <div className="space-y-3">
          {categories.map((category, index) => {
            const Icon = getCategoryIcon(category.name);
            const isExpanded = expandedIndex === index;
            
            return (
              <Collapsible key={index} open={isExpanded} onOpenChange={() => setExpandedIndex(isExpanded ? null : index)}>
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {category.keyPhrases.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {category.keyPhrases.length} phrases
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCategory(index);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 border-t bg-muted/20 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-sm">Typical Structure</Label>
                          <Textarea
                            placeholder="e.g., Hook → Detail → CTA"
                            value={category.typicalStructure}
                            onChange={(e) => updateCategory(index, { typicalStructure: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Tone Shift</Label>
                          <Textarea
                            placeholder="How does tone adjust for this content?"
                            value={category.toneShift}
                            onChange={(e) => updateCategory(index, { toneShift: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Key Phrases</Label>
                        <Input
                          placeholder="Enter phrases separated by commas"
                          value={category.keyPhrases.join(', ')}
                          onChange={(e) => updateCategory(index, { 
                            keyPhrases: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Length Guidance</Label>
                        <Input
                          placeholder="e.g., 2-3 sentences, 150-200 characters"
                          value={category.lengthGuidance}
                          onChange={(e) => updateCategory(index, { lengthGuidance: e.target.value })}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Add New Category */}
        {isAdding ? (
          <div className="p-4 rounded-lg border border-dashed space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Category Name *</Label>
                <Input
                  placeholder="e.g., Behind the Scenes"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Input
                  placeholder="What this category is for"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewCategory({ ...emptyCategory });
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addCategory}
                disabled={!newCategory.name.trim()}
              >
                Add Category
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Category
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
