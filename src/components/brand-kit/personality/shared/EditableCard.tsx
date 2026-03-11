import { useState, KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Plus, Check } from 'lucide-react';

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'tags';
  placeholder?: string;
}

interface EditableCardProps<T extends Record<string, any>> {
  data: T;
  fields: FieldConfig[];
  onChange: (updated: T) => void;
  onRemove: () => void;
  nameField: keyof T;
  previewFields?: (keyof T)[];
}

export function EditableCard<T extends Record<string, any>>({
  data,
  fields,
  onChange,
  onRemove,
  nameField,
  previewFields = [],
}: EditableCardProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const addTag = (fieldKey: string) => {
    if (!newTag.trim()) return;
    const currentTags = (data[fieldKey] as string[]) || [];
    if (!currentTags.includes(newTag.trim())) {
      handleFieldChange(fieldKey, [...currentTags, newTag.trim()]);
    }
    setNewTag('');
  };

  const removeTag = (fieldKey: string, tagToRemove: string) => {
    const currentTags = (data[fieldKey] as string[]) || [];
    handleFieldChange(fieldKey, currentTags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>, fieldKey: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(fieldKey);
    }
  };

  const getPreviewContent = () => {
    const previewParts: string[] = [];
    for (const field of previewFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        previewParts.push(value);
      }
    }
    return previewParts.join(' • ');
  };

  const getTags = () => {
    const tagsField = fields.find((f) => f.type === 'tags');
    if (!tagsField) return null;
    const tags = data[tagsField.key] as string[] | null;
    return tags && tags.length > 0 ? tags : null;
  };

  // Preview Mode
  if (!isEditing) {
    const tags = getTags();
    const preview = getPreviewContent();
    
    return (
      <Card 
        className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => setIsEditing(true)}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-medium truncate">{String(data[nameField] || '')}</h4>
              {preview && (
                <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
              )}
              {tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-accent rounded">
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="px-2 py-0.5 text-xs text-muted-foreground">
                      +{tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit Mode
  return (
    <Card className="bg-muted/50 border-primary/20">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                
                {field.type === 'text' && (
                  <Input
                    id={field.key}
                    value={String(data[field.key] || '')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
                
                {field.type === 'textarea' && (
                  <Textarea
                    id={field.key}
                    value={String(data[field.key] || '')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                  />
                )}
                
                {field.type === 'tags' && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {((data[field.key] as string[]) || []).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent rounded"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(field.key, tag)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => handleTagKeyDown(e, field.key)}
                        placeholder={field.placeholder || 'Add tag...'}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addTag(field.key)}
                        disabled={!newTag.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 ml-2"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            <Check className="h-4 w-4 mr-1" />
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
