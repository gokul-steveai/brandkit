import { Outlet, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrandKit } from '@/hooks/useBrandKits';

export function BrandKitEditLayout() {
  const { id } = useParams<{ id: string }>();
  const { data: brandKit, isLoading, refetch } = useBrandKit(id || '');

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!brandKit) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Brand kit not found</p>
        <Button asChild variant="outline">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Outlet context={{ brandKit, refetch }} />
    </div>
  );
}
