import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Loader({ className, size = 'md' }: LoaderProps) {
  return <Loader2 className={cn(sizeClasses[size], 'animate-spin', className)} />;
}

export function CenteredLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex justify-center p-8">
      <Loader size={size} />
    </div>
  );
}

export function FullScreenLoader({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader size={size} />
    </div>
  );
}
