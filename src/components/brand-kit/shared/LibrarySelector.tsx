import { useState } from 'react';
import { Check, Plus, User, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface LibraryItem {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  is_library: boolean;
  usage_count?: number;
}

interface LibrarySelectorProps {
  title: string;
  description: string;
  items: LibraryItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCreateCustom?: (item: { name: string; description: string }) => Promise<void>;
  maxSelections?: number;
  displayField?: 'name' | 'title';
}

export function LibrarySelector({
  title,
  description,
  items,
  selectedIds,
  onSelectionChange,
  onCreateCustom,
  maxSelections,
  displayField = 'name'
}: LibrarySelectorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      if (maxSelections && selectedIds.length >= maxSelections) {
        // Replace the first selection
        onSelectionChange([...selectedIds.slice(1), id]);
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    }
  };

  const handleCreate = async () => {
    if (!onCreateCustom || !newName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateCustom({ name: newName.trim(), description: newDescription.trim() });
      setNewName('');
      setNewDescription('');
      setShowCreateDialog(false);
    } finally {
      setIsCreating(false);
    }
  };

  const libraryItems = items.filter((i) => i.is_library);
  const userItems = items.filter((i) => !i.is_library);

  const getDisplayName = (item: LibraryItem) => {
    return displayField === 'title' ? item.title : item.name;
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>
              {description}
              {maxSelections && (
                <span className="ml-1">
                  ({selectedIds.length}/{maxSelections} selected)
                </span>
              )}
            </CardDescription>
          </div>
          {onCreateCustom && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Custom {title.replace(/s$/, '')}</DialogTitle>
                  <DialogDescription>
                    Add your own custom option. This will be saved to your account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter name..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Enter description..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Library Items */}
        {libraryItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Library className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Library Options</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {libraryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 text-left border-2 transition-colors',
                    selectedIds.includes(item.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center',
                      selectedIds.includes(item.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border'
                    )}
                  >
                    {selectedIds.includes(item.id) && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{getDisplayName(item)}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User Items */}
        {userItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Your Custom Options</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {userItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 text-left border-2 transition-colors',
                    selectedIds.includes(item.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center',
                      selectedIds.includes(item.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border'
                    )}
                  >
                    {selectedIds.includes(item.id) && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getDisplayName(item)}</p>
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No options available yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
