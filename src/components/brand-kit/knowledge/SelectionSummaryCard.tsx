import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SelectionSummaryCardProps {
  selectedCount: number;
}

export function SelectionSummaryCard({ selectedCount }: SelectionSummaryCardProps) {
  return (
    <Card className="border-2 border-border bg-muted/30">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected for export
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Selected files will be recommended when exporting your brand kit
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
