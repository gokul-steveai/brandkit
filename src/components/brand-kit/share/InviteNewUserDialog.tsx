import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail } from 'lucide-react';
import { type BrandKitMemberRole } from '@/hooks/useBrandKitMembers';

interface InviteNewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  role: BrandKitMemberRole;
  onSend: (firstName: string, lastName: string) => void;
  isLoading: boolean;
}

export function InviteNewUserDialog({
  open,
  onOpenChange,
  email,
  role,
  onSend,
  isLoading,
}: InviteNewUserDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const roleColors: Record<BrandKitMemberRole, string> = {
    viewer: 'bg-muted text-muted-foreground',
    editor: 'bg-primary/10 text-primary',
    admin: 'bg-destructive/10 text-destructive',
  };

  const handleSend = () => {
    if (!firstName.trim()) return;
    onSend(firstName.trim(), lastName.trim());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFirstName('');
      setLastName('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            This user doesn't have an account yet. Send them an invitation to sign up and join your brand kit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name *</Label>
              <Input
                id="first-name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Will be invited as</span>
            <Badge variant="secondary" className={roleColors[role]}>
              {role}
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading || !firstName.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
