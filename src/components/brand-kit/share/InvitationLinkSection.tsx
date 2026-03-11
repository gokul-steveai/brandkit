import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBrandKitInvitations, BrandKitInvitation } from '@/hooks/useBrandKitInvitations';
import { useBrandKitMembers } from '@/hooks/useBrandKitMembers';
import { useBrandKitSubscription } from '@/hooks/useBrandKitSubscription';
import { Link2, Copy, Check, Loader2, Trash2, Clock, AlertCircle, Zap } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InvitationLinkSectionProps {
  brandKitId: string;
}

type InvitationRole = 'viewer' | 'editor' | 'admin';

export function InvitationLinkSection({ brandKitId }: InvitationLinkSectionProps) {
  const { invitations, isLoading, createInvitation, revokeInvitation, isCreating, isRevoking } = useBrandKitInvitations(brandKitId);
  const { members } = useBrandKitMembers(brandKitId);
  const { ownerTier, planConfig } = useBrandKitSubscription(brandKitId);
  const [role, setRole] = useState<InvitationRole>('viewer');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // If selected role is no longer available, switch to an available one
  const effectiveRole = canAddRole[role] ? role : 
    canAddRole.viewer ? 'viewer' : 
    canAddRole.editor ? 'editor' : 
    canAddRole.admin ? 'admin' : role;

  const handleCreateLink = async () => {
    if (!canAddRole[effectiveRole]) {
      toast({ 
        title: 'Limit reached', 
        description: `You've reached the maximum number of ${effectiveRole}s for your plan.`, 
        variant: 'destructive' 
      });
      return;
    }
    
    const invitation = await createInvitation({ brand_kit_id: brandKitId, role: effectiveRole });
    if (invitation) {
      copyToClipboard(invitation.token, invitation.id);
    }
  };

  const copyToClipboard = (token: string, invitationId: string) => {
    const url = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invitationId);
    toast({ title: 'Link copied!', description: 'Share this link with your team member.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (invitationId: string) => {
    await revokeInvitation(invitationId);
  };

  const roleColors: Record<string, string> = {
    viewer: 'bg-muted text-muted-foreground',
    editor: 'bg-primary/10 text-primary',
    admin: 'bg-destructive/10 text-destructive',
  };

  const formatLimit = (count: number, limit: number) => {
    if (limit === -1) return `${count} (unlimited)`;
    return `${count}/${limit}`;
  };

  const allRolesAtLimit = !canAddRole.viewer && !canAddRole.editor && !canAddRole.admin;

  return (
    <div className="space-y-4">
      {/* Role usage summary */}
      <div className="flex flex-wrap gap-2 text-xs">
        <TooltipProvider>
          {limits.editor > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={canAddRole.editor ? "secondary" : "outline"} className="cursor-help">
                  Editors: {formatLimit(roleCounts.editor, limits.editor)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {canAddRole.editor 
                  ? `You can add ${limits.editor - roleCounts.editor} more editor(s)`
                  : 'Editor limit reached for your plan'}
              </TooltipContent>
            </Tooltip>
          )}
          {limits.admin > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={canAddRole.admin ? "secondary" : "outline"} className="cursor-help">
                  Admins: {formatLimit(roleCounts.admin, limits.admin)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {canAddRole.admin 
                  ? `You can add ${limits.admin - roleCounts.admin} more admin(s)`
                  : 'Admin limit reached for your plan'}
              </TooltipContent>
            </Tooltip>
          )}
          {limits.viewer > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={canAddRole.viewer ? "secondary" : "outline"} className="cursor-help">
                  Viewers: {formatLimit(roleCounts.viewer, limits.viewer)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {canAddRole.viewer 
                  ? `You can add ${limits.viewer - roleCounts.viewer} more viewer(s)`
                  : 'Viewer limit reached for your plan'}
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>

      {/* Show upgrade prompt if all limits reached or on free plan */}
      {(allRolesAtLimit || ownerTier === 'free') && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            {ownerTier === 'free' ? (
              <p className="text-muted-foreground">
                Upgrade to Base or Premium to invite team members.
              </p>
            ) : (
              <p className="text-muted-foreground">
                You've reached your collaboration limits. Upgrade your plan to add more team members.
              </p>
            )}
            <Button asChild variant="link" className="h-auto p-0 text-sm">
              <Link to="/settings?tab=billing&source=share-dialog&action=upgrade">
                <Zap className="h-3 w-3 mr-1" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Invitation form - only show if at least one role is available */}
      {!allRolesAtLimit && ownerTier !== 'free' && (
        <div className="space-y-2">
          <Label>Generate an invitation link</Label>
          <div className="flex gap-2">
            <Select 
              value={effectiveRole} 
              onValueChange={(v) => setRole(v as InvitationRole)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer" disabled={!canAddRole.viewer}>
                  Viewer {!canAddRole.viewer && '(full)'}
                </SelectItem>
                <SelectItem value="editor" disabled={!canAddRole.editor || limits.editor === 0}>
                  Editor {limits.editor === 0 ? '(upgrade)' : !canAddRole.editor ? '(full)' : ''}
                </SelectItem>
                <SelectItem value="admin" disabled={!canAddRole.admin || limits.admin === 0}>
                  Admin {limits.admin === 0 ? '(upgrade)' : !canAddRole.admin ? '(full)' : ''}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleCreateLink} 
              disabled={isCreating || !canAddRole[effectiveRole]} 
              className="flex-1"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Generate Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Anyone with the link can join as the selected role. Links expire in 7 days.
          </p>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Pending Invitations</Label>
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                roleColors={roleColors}
                isCopied={copiedId === invitation.id}
                onCopy={() => copyToClipboard(invitation.token, invitation.id)}
                onRevoke={() => handleRevoke(invitation.id)}
                isRevoking={isRevoking}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface InvitationRowProps {
  invitation: BrandKitInvitation;
  roleColors: Record<string, string>;
  isCopied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
  isRevoking: boolean;
}

function InvitationRow({ invitation, roleColors, isCopied, onCopy, onRevoke, isRevoking }: InvitationRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm">
      <Badge variant="secondary" className={roleColors[invitation.role]}>
        {invitation.role}
      </Badge>
      <div className="flex-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
        {isCopied ? <Check className="h-3.5 w-3.5 text-chart-2" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onRevoke}
        disabled={isRevoking}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
