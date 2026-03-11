import { Plus, Palette, TrendingUp, Clock, Archive, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandKits } from '@/hooks/useBrandKits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BrandKitCard, CreateBrandKitDialog } from '@/components/brand-kit/dashboard';
import { UsageCard } from '@/components/subscription/UsageCard';
import { useState } from 'react';
import { toast } from '@/hooks/useToast';

export default function Dashboard() {
  const { user, role, canCreate } = useAuth();
  const { 
    brandKits, 
    totalCount,
    isLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    deleteBrandKit,
    updateBrandKit 
  } = useBrandKits();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Filter brand kits based on archived toggle
  const visibleBrandKits = showArchived 
    ? brandKits 
    : brandKits.filter(kit => kit.status !== 'archived');

  const activeBrandKits = brandKits.filter(kit => kit.status === 'active').length;
  const archivedBrandKits = brandKits.filter(kit => kit.status === 'archived').length;
  const avgCompletion = visibleBrandKits.length 
    ? Math.round(visibleBrandKits.reduce((acc, kit) => acc + kit.completion_percentage, 0) / visibleBrandKits.length)
    : 0;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this brand kit?')) {
      await deleteBrandKit(id);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await updateBrandKit({ id, status: 'active' });
      toast({ title: 'Brand kit activated', description: 'Your brand kit is now active and ready for use.' });
    } catch (error) {
      toast({ title: 'Failed to activate', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-muted-foreground">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </p>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Brand Kit
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brand Kits</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{visibleBrandKits.length}</div>
            {archivedBrandKits > 0 && !showArchived && (
              <p className="text-xs text-muted-foreground mt-1">
                +{archivedBrandKits} archived
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Kits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBrandKits}</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgCompletion}%</div>
          </CardContent>
        </Card>

        {/* Token Usage Card */}
        <UsageCard />
      </div>

      {/* Brand Kits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Brand Kits</h2>
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
              {showArchived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Show archived
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-2 border-border">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : visibleBrandKits.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleBrandKits.map(kit => (
                <BrandKitCard 
                  key={kit.id} 
                  brandKit={kit} 
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                  isOwnerOrAdmin={kit.user_id === user?.id}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="border-2 border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Palette className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No brand kits yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first brand kit to get started
              </p>
              {canCreate && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Brand Kit
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateBrandKitDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
