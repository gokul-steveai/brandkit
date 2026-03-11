import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  uris: string[];
  onUrisChange: (uris: string[]) => void;
  label: string;
  placeholder?: string;
}

export function UriManager({ uris, onUrisChange, label, placeholder = "https://example.com/callback" }: Props) {
  const addUri = () => {
    onUrisChange([...uris, '']);
  };

  const removeUri = (index: number) => {
    const newUris = uris.filter((_, i) => i !== index);
    onUrisChange(newUris.length ? newUris : ['']);
  };

  const updateUri = (index: number, value: string) => {
    const newUris = [...uris];
    newUris[index] = value;
    onUrisChange(newUris);
  };

  return (
    <div className="space-y-2">
      <Label>{label} *</Label>
      <div className="space-y-2">
        {uris.map((uri, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={uri}
              onChange={(e) => updateUri(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            {uris.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeUri(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addUri} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add URI
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Must be valid HTTPS URLs
      </p>
    </div>
  );
}