import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChatMetadata } from '../types';

interface ChatFieldsProps {
  metadata: ChatMetadata;
  onChange: (metadata: ChatMetadata) => void;
}

export function ChatFields({ metadata, onChange }: ChatFieldsProps) {
  const handleChange = (field: keyof ChatMetadata, value: string) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Chat Platform</Label>
          <Input
            id="platform"
            placeholder="Slack, Discord, etc."
            value={metadata.platform || ''}
            onChange={(e) => handleChange('platform', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="context">Context</Label>
          <Input
            id="context"
            placeholder="Customer support, team discussion, etc."
            value={metadata.context || ''}
            onChange={(e) => handleChange('context', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
