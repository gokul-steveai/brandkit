import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrandKitMembers, BrandKitMemberRole, BrandKitMember } from '@/hooks/useBrandKitMembers';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, Trash2, Link2 } from 'lucide-react';
import { InvitationLinkSection } from './InvitationLinkSection';
import { ConfirmAddMemberDialog } from './ConfirmAddMemberDialog';
import { InviteNewUserDialog } from './InviteNewUserDialog';
import { toast } from '@/hooks/useToast';

interface ShareBrandKitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKitId: string;
  brandKitName: string;
  ownerId: string;
}

interface FoundUser {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export function ShareBrandKitDialog({ 
  open, 
  onOpenChange, 
  brandKitId, 
  brandKitName,
  ownerId 
}: ShareBrandKitDialogProps) {
  const { user } = useAuth();
  const { members, isLoading, updateMember, removeMember } = useBrandKitMembers(brandKitId);
  const { ownerTier, planConfig } = useBrandKitSubscription(brandKitId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BrandKitMemberRole>('viewer');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const isOwner = user?.id === ownerId;

  // Calculate current counts and limits for each role
  const roleCounts = useMemo(() => {
    const counts = { editor: 0, admin: 0, viewer: 0 };
    members.forEach(m => {
      if (m.role in counts) {
        counts[m.role as keyof typeof counts]++;
      }
    });
    return counts;
  }, [members]);

  const limits = useMemo(() => ({
    editor: planConfig.limits.editors ?? 0,
    admin: planConfig.limits.admins ?? 0,
    viewer: planConfig.limits.viewers ?? 0,
  }), [planConfig]);

  const canAddRole = useMemo(() => ({
    editor: roleCounts.editor < limits.editor,
    admin: roleCounts.admin < limits.admin,
    viewer: roleCounts.viewer < limits.viewer,
  }), [limits, roleCounts]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    if (!canAddRole[role]) {
      toast({ 
        title: 'Limit reached', 
        description: `You've reached the maximum number of ${role}s for your plan.`, 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-member-by-email', {
        body: { action: 'lookup', brand_kit_id: brandKitId, email: email.trim() },
      });

      if (error) {
        toast({ title: 'Failed to look up user', description: error.message, variant: 'destructive' });
        return;
      }

      if (data.status === 'found') {
        setFoundUser(data.user);
        setConfirmOpen(true);
      } else if (data.status === 'already_member') {
        toast({ title: 'Already a member', description: 'This user is already a member of this brand kit.', variant: 'destructive' });
      } else if (data.status === 'not_found') {
        setInviteEmail(email.trim());
        setInviteOpen(true);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleConfirmAdd = async () => {
    setIsAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-member-by-email', {
        body: { action: 'add', brand_kit_id: brandKitId, email: foundUser!.email, role },
      });

      if (error || !data?.success) {
        toast({ title: 'Failed to add member', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Member added successfully' });
      setConfirmOpen(false);
      setFoundUser(null);
      setEmail('');
      setRole('viewer');
      // Refresh the members list
      window.dispatchEvent(new CustomEvent('invalidate-brand-kit-members'));
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSendInvite = async (firstName: string, lastName: string) => {
    setIsSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-member-by-email', {
        body: {
          action: 'invite',
          brand_kit_id: brandKitId,
          email: inviteEmail,
          role,
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (error || !data?.success) {
        toast({ title: 'Failed to send invitation', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Invitation sent!', description: `An email invitation has been sent to ${inviteEmail}.` });
      setInviteOpen(false);
      setInviteEmail('');
      setEmail('');
      setRole('viewer');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: BrandKitMemberRole) => {
    await updateMember({ id: memberId, role: newRole });
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const roleColors: Record<BrandKitMemberRole, string> = {
    viewer: 'bg-muted text-muted-foreground',
    editor: 'bg-primary/10 text-primary',
    admin: 'bg-destructive/10 text-destructive',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share "{brandKitName}"</DialogTitle>
            <DialogDescription>
              Invite team members to collaborate on this brand kit.
            </DialogDescription>
          </DialogHeader>

          {isOwner && (
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Invite via Link
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Add by Email
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="link" className="mt-4">
                <InvitationLinkSection brandKitId={brandKitId} />
              </TabsContent>
              
              <TabsContent value="email" className="mt-4">
                <form onSubmit={handleLookup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={role} onValueChange={(v) => setRole(v as BrandKitMemberRole)}>
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer" disabled={!canAddRole.viewer && limits.viewer > 0}>
                            Viewer {limits.viewer > 0 && !canAddRole.viewer ? '(full)' : ''}
                          </SelectItem>
                          <SelectItem value="editor" disabled={!canAddRole.editor || limits.editor === 0}>
                            Editor {limits.editor === 0 ? '(upgrade)' : !canAddRole.editor ? '(full)' : ''}
                          </SelectItem>
                          <SelectItem value="admin" disabled={!canAddRole.admin || limits.admin === 0}>
                            Admin {limits.admin === 0 ? '(upgrade)' : !canAddRole.admin ? '(full)' : ''}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter an email to add an existing user or invite a new one.
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLookingUp || !email.trim() || !canAddRole[role]} 
                    className="w-full"
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Add Member
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Team members</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members yet. Add someone to collaborate!
              </p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOwner={isOwner}
                    currentUserId={user?.id}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                    roleColors={roleColors}
                    getInitials={getInitials}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Viewer:</strong> Can view brand kit content</p>
            <p><strong>Editor:</strong> Can edit brand kit content</p>
            <p><strong>Admin:</strong> Full access except delete</p>
          </div>
        </DialogContent>
      </Dialog>

      {foundUser && (
        <ConfirmAddMemberDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          user={foundUser}
          role={role}
          onConfirm={handleConfirmAdd}
          isLoading={isAdding}
        />
      )}

      <InviteNewUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        email={inviteEmail}
        role={role}
        onSend={handleSendInvite}
        isLoading={isSendingInvite}
      />
    </>
  );
}

interface MemberRowProps {
  member: BrandKitMember;
  isOwner: boolean;
  currentUserId?: string;
  onRoleChange: (memberId: string, role: BrandKitMemberRole) => void;
  onRemove: (memberId: string) => void;
  roleColors: Record<BrandKitMemberRole, string>;
  getInitials: (name: string | null, email: string | null) => string;
}

function MemberRow({ 
  member, 
  isOwner, 
  currentUserId,
  onRoleChange, 
  onRemove,
  roleColors,
  getInitials 
}: MemberRowProps) {
  const isSelf = member.user_id === currentUserId;
  const profile = member.profile;

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(profile?.full_name || null, profile?.email || null)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {profile?.full_name || profile?.email || 'Unknown user'}
          {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
        </p>
        {profile?.full_name && profile?.email && (
          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
        )}
      </div>
      {isOwner ? (
        <div className="flex items-center gap-2">
          <Select 
            value={member.role} 
            onValueChange={(v) => onRoleChange(member.id, v as BrandKitMemberRole)}
          >
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(member.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Badge variant="secondary" className={roleColors[member.role]}>
          {member.role}
        </Badge>
      )}
    </div>
  );
}
