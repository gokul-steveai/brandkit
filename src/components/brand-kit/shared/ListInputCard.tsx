import { Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ListInputCardProps {
  label: string;
  items: string[];
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** If true, the list is read-only (for viewer role) */
  readOnly?: boolean;
}

export function ListInputCard({
  label,
  items,
  value,
  setValue,
  placeholder,
  onAdd,
  onRemove,
  readOnly = false,
}: ListInputCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !readOnly) {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {readOnly && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Eye className="h-3 w-3" />
            View Only
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted border border-border text-sm">
            <span className="flex-1">{item}</span>
            {!readOnly && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(index)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
          />
          <Button size="sm" onClick={onAdd} disabled={!value.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
