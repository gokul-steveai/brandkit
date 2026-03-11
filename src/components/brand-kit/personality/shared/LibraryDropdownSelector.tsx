import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface LibraryItem {
  id: string;
  name: string;
  is_library: boolean;
  [key: string]: any;
}

interface LibraryDropdownSelectorProps<T extends LibraryItem> {
  items: T[];
  selectedItems: T[];
  onSelectionChange: (items: T[]) => void;
  onCreateClick: () => void;
  placeholder?: string;
  maxSelections?: number;
}

export function LibraryDropdownSelector<T extends LibraryItem>({
  items,
  selectedItems,
  onSelectionChange,
  onCreateClick,
  placeholder = 'Select items...',
  maxSelections = 5,
}: LibraryDropdownSelectorProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedIds = selectedItems.map((item) => item.id);

  const toggleSelection = (item: T) => {
    if (selectedIds.includes(item.id)) {
      onSelectionChange(selectedItems.filter((i) => i.id !== item.id));
    } else if (selectedItems.length < maxSelections) {
      onSelectionChange([...selectedItems, item]);
    }
  };

  const removeSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedItems.filter((i) => i.id !== id));
  };

  const libraryItems = items.filter((item) => item.is_library);
  const userItems = items.filter((item) => !item.is_library);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[40px]"
          >
            <span className="text-muted-foreground">
              {selectedItems.length > 0
                ? `${selectedItems.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 bg-popover z-50" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No items found.</CommandEmpty>
              
              {libraryItems.length > 0 && (
                <CommandGroup heading="Library">
                  {libraryItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => toggleSelection(item)}
                      disabled={
                        !selectedIds.includes(item.id) &&
                        selectedItems.length >= maxSelections
                      }
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedIds.includes(item.id)
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {userItems.length > 0 && (
                <CommandGroup heading="Your Custom Items">
                  {userItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => toggleSelection(item)}
                      disabled={
                        !selectedIds.includes(item.id) &&
                        selectedItems.length >= maxSelections
                      }
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedIds.includes(item.id)
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            
            <div className="border-t p-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  onCreateClick();
                }}
                className="w-full bg-create hover:bg-create/80 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected items as removable tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm border bg-secondary"
            >
              {item.name}
              <button
                onClick={(e) => removeSelection(item.id, e)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {selectedItems.length}/{maxSelections} selected
      </p>
    </div>
  );
}
