import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import { Loader2, User, Users, Settings as SettingsIcon, CreditCard, ArrowLeft, Key, ExternalLink, Share2, FolderOpen, Plug } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BillingSettings } from '@/components/subscription/BillingSettings';
import { AvatarUpload, ApiKeysTab, PartnerIntegrationsTab } from '@/components/settings';
import { useBrandKitMemberships, BrandKitMembership } from '@/hooks/useBrandKitMemberships';
import { ShareBrandKitDialog } from '@/components/brand-kit/share';

export default function Settings() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultTab = searchParams.get('tab') || 'profile';
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    auto_save: true,
    avatar_url: null as string | null,
    signed_url_expiry_months: 12,
  });

  // Share dialog state
  const [shareDialogState, setShareDialogState] = useState<{
    open: boolean;
    brandKitId: string;
    brandKitName: string;
    ownerId: string;
  } | null>(null);

  const { data: memberships, isLoading: isMembershipsLoading } = useBrandKitMemberships();

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || user.email || '',
        auto_save: data.auto_save ?? true,
        avatar_url: data.avatar_url,
        signed_url_expiry_months: data.signed_url_expiry_months ?? 12,
      });
    }
  };

  const handleAvatarUpdate = (url: string) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name })
      .eq('id', user.id);

    setIsLoading(false);

    if (error) {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated successfully' });
    }
  };

  const handleAutoSaveToggle = async (checked: boolean) => {
    if (!user) return;

    setProfile(prev => ({ ...prev, auto_save: checked }));
    
    const { error } = await supabase
      .from('profiles')
      .update({ auto_save: checked })
      .eq('id', user.id);

    if (error) {
      setProfile(prev => ({ ...prev, auto_save: !checked }));
      toast({ title: 'Failed to update preference', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: checked ? 'Auto-save enabled' : 'Auto-save disabled' });
    }
  };

  const handleSignedUrlExpiryChange = async (months: number) => {
    if (!user) return;

    const previousValue = profile.signed_url_expiry_months;
    setProfile(prev => ({ ...prev, signed_url_expiry_months: months }));

    const { error } = await supabase
      .from('profiles')
      .update({ signed_url_expiry_months: months })
      .eq('id', user.id);

    if (error) {
      setProfile(prev => ({ ...prev, signed_url_expiry_months: previousValue }));
      toast({ title: 'Failed to update preference', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Signed URL expiry updated' });
    }
  };

  const handleOpenBrandKit = (brandKitId: string) => {
    navigate(`/brand-kits/${brandKitId}/edit`);
  };

  const handleOpenShareDialog = (membership: BrandKitMembership) => {
    setShareDialogState({
      open: true,
      brandKitId: membership.brandKitId,
      brandKitName: membership.brandKitName,
      ownerId: membership.ownerId,
    });
  };

  const platformRoleColors: Record<string, string> = {
    viewer: 'bg-muted text-muted-foreground',
    author: 'bg-primary/10 text-primary',
    admin: 'bg-destructive/10 text-destructive'
  };

  const brandKitRoleColors: Record<string, string> = {
    owner: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    admin: 'bg-destructive/10 text-destructive',
    editor: 'bg-primary/10 text-primary',
    viewer: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground ml-12">
          Manage your account settings and billing
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-6 lg:w-[720px] gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 shrink-0">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 shrink-0">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team & Access</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 shrink-0">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 shrink-0">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 shrink-0">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 shrink-0">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload */}
                {user && (
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <AvatarUpload
                      userId={user.id}
                      currentAvatarUrl={profile.avatar_url}
                      fullName={profile.full_name}
                      onAvatarUpdate={handleAvatarUpdate}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <div className="space-y-6">
            {/* Brand Kit Access Section */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle>Brand Kit Access</CardTitle>
                <CardDescription>Brand kits you own or have been invited to collaborate on</CardDescription>
              </CardHeader>
              <CardContent>
                {isMembershipsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : !memberships || memberships.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">No brand kits yet</p>
                      <p className="text-xs text-muted-foreground">
                        Create your first brand kit or ask someone to share their brand kit with you.
                      </p>
                    </div>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {memberships.map((membership) => (
                      <div 
                        key={membership.brandKitId}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{membership.brandKitName}</p>
                            <Badge className={brandKitRoleColors[membership.role]} variant="secondary">
                              {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {membership.isOwner 
                              ? 'Owned by you' 
                              : `Owned by ${membership.ownerName || 'Unknown'}`
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleOpenBrandKit(membership.brandKitId)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                          {membership.isOwner && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenShareDialog(membership)}
                            >
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {memberships && memberships.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-4">
                    If you don't see a brand kit here, ask the owner to share it with you via the Share button.
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Platform Role Section */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle>Platform Role</CardTitle>
                <CardDescription>Your account type determines what you can do on the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Current Role:</span>
                  <Badge className={platformRoleColors[role || 'viewer']}>
                    {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Viewer'}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Author:</strong> Can create and manage your own brand kits</p>
                  <p><strong>Admin:</strong> Platform administrator with access to all brand kits</p>
                </div>
              </CardContent>
            </Card>

            {/* Role Legend */}
            <Card className="border border-border bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs font-medium mb-2">Brand Kit Role Permissions</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Owner:</strong> Full control including sharing and deletion</p>
                  <p><strong>Admin:</strong> Full access except delete</p>
                  <p><strong>Editor:</strong> Can edit brand kit content</p>
                  <p><strong>Viewer:</strong> Can view brand kit content (read-only)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your editing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes as you edit
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={profile.auto_save}
                  onCheckedChange={handleAutoSaveToggle}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-0.5">
                  <Label htmlFor="url-expiry">Signed URL Expiry</Label>
                  <p className="text-sm text-muted-foreground">
                    How long media file links remain valid (default: 1 year)
                  </p>
                </div>
                <Select
                  value={String(profile.signed_url_expiry_months)}
                  onValueChange={(value) => handleSignedUrlExpiryChange(Number(value))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">1 year</SelectItem>
                    <SelectItem value="24">2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="integrations">
          <PartnerIntegrationsTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </Tabs>

      {/* Share Dialog */}
      {shareDialogState && (
        <ShareBrandKitDialog
          open={shareDialogState.open}
          onOpenChange={(open) => setShareDialogState(prev => prev ? { ...prev, open } : null)}
          brandKitId={shareDialogState.brandKitId}
          brandKitName={shareDialogState.brandKitName}
          ownerId={shareDialogState.ownerId}
        />
      )}
    </div>
  );
}
