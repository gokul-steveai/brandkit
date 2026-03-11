import { useState } from 'react';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BrandPromiseItem {
  title: string;
  description: string;
}

interface BrandPromisesCardProps {
  title: string;
  description: string;
  tip?: string;
  tipFormat?: string;
  items: BrandPromiseItem[];
  onChange: (items: BrandPromiseItem[]) => void;
}

export function BrandPromisesCard({
  title,
  description,
  tip,
  tipFormat,
  items,
  onChange
}: BrandPromisesCardProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (newTitle.trim() && newDescription.trim()) {
      onChange([...items, { title: newTitle.trim(), description: newDescription.trim() }]);
      setNewTitle('');
      setNewDescription('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTitle.trim() && newDescription.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {tip && (
          <div className="flex items-start gap-2 p-3 bg-tooltip rounded-none border-2 border-border mt-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Tip</p>
              <p className="text-muted-foreground">{tip}</p>
              {tipFormat && (
                <p className="font-mono text-xs mt-1 text-primary">Format: {tipFormat}</p>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Items */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted border-2 border-border group"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Item */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Title (e.g., Customer First)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Description (e.g., We prioritize your needs)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              onClick={handleAdd}
              disabled={!newTitle.trim() || !newDescription.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
