import { LucideIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  onAction: () => void;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  buttonText,
  onAction
}: EmptyStateCardProps) {
  return (
    <Card className="border-2 border-dashed border-border">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-4">{description}</p>
        <Button onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
