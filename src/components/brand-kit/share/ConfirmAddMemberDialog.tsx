import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus } from 'lucide-react';
import { type BrandKitMemberRole } from '@/hooks/useBrandKitMembers';

interface FoundUser {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface ConfirmAddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: FoundUser;
  role: BrandKitMemberRole;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ConfirmAddMemberDialog({
  open,
  onOpenChange,
  user,
  role,
  onConfirm,
  isLoading,
}: ConfirmAddMemberDialogProps) {
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  const roleColors: Record<BrandKitMemberRole, string> = {
    viewer: 'bg-muted text-muted-foreground',
    editor: 'bg-primary/10 text-primary',
    admin: 'bg-destructive/10 text-destructive',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Add Member</DialogTitle>
          <DialogDescription>
            Add this user to your brand kit?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {user.full_name || 'Unknown'}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
          <Badge variant="secondary" className={roleColors[role]}>
            {role}
          </Badge>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
