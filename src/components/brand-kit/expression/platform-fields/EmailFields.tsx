import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailMetadata } from '../types';

interface EmailFieldsProps {
  metadata: EmailMetadata;
  onChange: (metadata: EmailMetadata) => void;
}

export function EmailFields({ metadata, onChange }: EmailFieldsProps) {
  const handleChange = (field: keyof EmailMetadata, value: string) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sender">Sender</Label>
          <Input
            id="sender"
            placeholder="john@example.com"
            value={metadata.sender || ''}
            onChange={(e) => handleChange('sender', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_type">Email Type</Label>
          <Select
            value={metadata.email_type || ''}
            onValueChange={(value) => handleChange('email_type', value)}
          >
            <SelectTrigger id="email_type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Email Subject</Label>
        <Input
          id="subject"
          placeholder="Re: Your question about..."
          value={metadata.subject || ''}
          onChange={(e) => handleChange('subject', e.target.value)}
        />
      </div>
    </div>
  );
}
