import { useState } from 'react';
import { Filter } from 'lucide-react';
import { CHANGELOG_TAGS, type ChangelogTagKey } from '@/lib/changelog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChangelogTagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function ChangelogTagFilter({ selectedTags, onTagsChange }: ChangelogTagFilterProps) {
  const [open, setOpen] = useState(false);
  const [tempTags, setTempTags] = useState<string[]>(selectedTags);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempTags(selectedTags);
    }
    setOpen(isOpen);
  };

  const handleTagToggle = (tag: string) => {
    setTempTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleApply = () => {
    onTagsChange(tempTags);
    setOpen(false);
  };

  const handleClear = () => {
    setTempTags([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {selectedTags.length > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {selectedTags.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter by Tags</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(CHANGELOG_TAGS) as ChangelogTagKey[]).map((tag) => (
              <label
                key={tag}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted"
              >
                <Checkbox
                  checked={tempTags.includes(tag)}
                  onCheckedChange={() => handleTagToggle(tag)}
                />
                <span className="text-sm">{CHANGELOG_TAGS[tag].label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button variant="ghost" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
