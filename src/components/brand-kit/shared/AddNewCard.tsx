import { Plus, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AddNewCardProps {
  title: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function AddNewCard({
  title,
  description,
  onClick,
  disabled = false,
  disabledReason,
}: AddNewCardProps) {
  return (
    <Card
      className={cn(
        'border-2 border-dashed cursor-pointer transition-all min-h-[200px] flex items-center justify-center',
        disabled
          ? 'border-muted bg-muted/30 cursor-not-allowed'
          : 'border-border hover:border-primary/50 hover:bg-accent/30'
      )}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="flex flex-col items-center justify-center text-center p-6">
        {disabled ? (
          <>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">{title}</p>
            {disabledReason && (
              <p className="text-sm text-muted-foreground mt-1">{disabledReason}</p>
            )}
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">{title}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
