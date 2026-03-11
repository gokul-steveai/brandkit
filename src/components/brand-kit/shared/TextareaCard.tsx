import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface TextareaCardProps {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  id?: string;
  name?: string;
  /** If true, the textarea is read-only (for viewer role) */
  readOnly?: boolean;
}

export function TextareaCard({
  title,
  description,
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  className,
  id,
  name,
  readOnly = false,
}: TextareaCardProps) {
  const inputId = id || name || title.toLowerCase().replace(/\s+/g, '-');

  return (
    <Card className={`border-2 border-border ${className || ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {readOnly && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Eye className="h-3 w-3" />
              View Only
            </Badge>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {label && <Label htmlFor={inputId}>{label}</Label>}
          <Textarea
            id={inputId}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            disabled={readOnly}
            className={readOnly ? 'bg-disabled text-disabled-foreground cursor-not-allowed' : ''}
          />
        </div>
      </CardContent>
    </Card>
  );
}
