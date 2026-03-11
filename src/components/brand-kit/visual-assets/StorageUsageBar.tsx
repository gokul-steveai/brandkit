import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, HardDrive } from 'lucide-react';
import { STORAGE_LIMITS } from './types';

interface StorageUsageBarProps {
  usedBytes: number;
  tier: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StorageUsageBar({ usedBytes, tier }: StorageUsageBarProps) {
  const limitBytes = STORAGE_LIMITS[tier] || STORAGE_LIMITS.free;
  const percentage = Math.min((usedBytes / limitBytes) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>Storage Used</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
          </span>
          {isNearLimit && !isAtLimit && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Near limit
            </Badge>
          )}
          {isAtLimit && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Upgrade needed
            </Badge>
          )}
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-amber-500' : ''}`}
      />
    </div>
  );
}
