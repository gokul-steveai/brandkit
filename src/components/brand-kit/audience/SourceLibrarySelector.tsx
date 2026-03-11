import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LibrarySource } from './types';
import { AddSourceDialog } from './AddSourceDialog';

interface SourceLibrarySelectorProps {
  sourceType: 'information_source' | 'influencer' | 'technology';
  label: string;
  selectedNames: string[];
  onSelectionChange: (names: string[]) => void;
}

export function SourceLibrarySelector({
  sourceType,
  label,
  selectedNames,
  onSelectionChange,
}: SourceLibrarySelectorProps) {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<LibrarySource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const fetchSources = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('library_target_audience_sources')
        .select('*')
        .eq('source_type', sourceType)
        .order('name');

      if (!error && data) {
        setSources(data as LibrarySource[]);
      }
      setIsLoading(false);
    };

    fetchSources();
  }, [sourceType]);

  const filteredSources = sources.filter((source) =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAddNew = searchQuery.length > 0 && 
    !filteredSources.some(s => s.name.toLowerCase() === searchQuery.toLowerCase());

  const toggleSelection = (name: string) => {
    if (selectedNames.includes(name)) {
      onSelectionChange(selectedNames.filter((n) => n !== name));
    } else {
      onSelectionChange([...selectedNames, name]);
    }
  };

  const handleSourceAdded = (newSource: LibrarySource) => {
    setSources((prev) => [...prev, newSource].sort((a, b) => a.name.localeCompare(b.name)));
    toggleSelection(newSource.name);
    setSearchQuery('');
  };

  const removeItem = (name: string) => {
    onSelectionChange(selectedNames.filter((n) => n !== name));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedNames.length > 0
              ? `${selectedNames.length} selected`
              : `Select ${label.toLowerCase()}...`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search or add new...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <>
                  {filteredSources.length === 0 && !showAddNew && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No results found.
                    </div>
                  )}
                  {filteredSources.length === 0 && showAddNew && (
                    <div
                      className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                      onClick={() => setShowAddDialog(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add "{searchQuery}" as new source
                    </div>
                  )}
                  <CommandGroup>
                    {filteredSources.map((source) => (
                      <CommandItem
                        key={source.id}
                        value={source.name}
                        onSelect={() => toggleSelection(source.name)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedNames.includes(source.name)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          {source.favicon_url && (
                            <img
                              src={source.favicon_url}
                              alt=""
                              className="w-4 h-4 rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span>{source.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                    {showAddNew && filteredSources.length > 0 && (
                      <CommandItem
                        onSelect={() => setShowAddDialog(true)}
                        className="cursor-pointer border-t"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add "{searchQuery}" as new source
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {selectedNames.map((name) => {
            const source = sources.find((s) => s.name === name);
            return (
              <Badge
                key={name}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {source?.favicon_url && (
                  <img
                    src={source.favicon_url}
                    alt=""
                    className="w-3 h-3 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeItem(name)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      <AddSourceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        sourceType={sourceType}
        initialName={searchQuery}
        onSourceAdded={handleSourceAdded}
      />
    </div>
  );
}
