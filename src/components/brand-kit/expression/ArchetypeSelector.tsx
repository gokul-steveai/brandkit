import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useLibraryArchetypes,
  LibraryArchetype,
  ArchetypeCategory,
  ARCHETYPE_CATEGORY_LABELS,
} from '@/hooks/useLibraryArchetypes';
import { VoiceArchetype } from './VoiceArchetypesCard';

interface ArchetypeSelectorProps {
  value: VoiceArchetype | null;
  onChange: (archetype: VoiceArchetype) => void;
  /** Optional callback to also receive the full LibraryArchetype data */
  onSelectFull?: (archetype: LibraryArchetype) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ROLE_TYPE_COLORS: Record<string, string> = {
  Default: 'bg-primary/20 text-primary',
  Human: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  Fantastical: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  Collective: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  Systematic: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  Functional: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
  'Non-human': 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
};

export function ArchetypeSelector({
  value,
  onChange,
  onSelectFull,
  placeholder = 'Select an archetype...',
  disabled = false,
}: ArchetypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ArchetypeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: archetypes = [], isLoading } = useLibraryArchetypes();

  const filteredArchetypes = useMemo(() => {
    let filtered = archetypes;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.key_traits.some(t => t.toLowerCase().includes(query)) ||
        a.role_type.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [archetypes, categoryFilter, searchQuery]);

  const groupedArchetypes = useMemo(() => {
    const groups: Record<ArchetypeCategory, LibraryArchetype[]> = {
      core: [],
      functional_collective: [],
      relational_emotional: [],
    };
    
    filteredArchetypes.forEach(a => {
      if (groups[a.category as ArchetypeCategory]) {
        groups[a.category as ArchetypeCategory].push(a);
      }
    });
    
    return groups;
  }, [filteredArchetypes]);

  const handleSelect = (archetype: LibraryArchetype) => {
    onChange({
      name: archetype.name,
      description: archetype.llm_instruction,
      characteristics: archetype.key_traits,
    });
    // Also call the full archetype callback if provided
    onSelectFull?.(archetype);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value?.name ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {value.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          <Tabs 
            value={categoryFilter} 
            onValueChange={(v) => setCategoryFilter(v as ArchetypeCategory | 'all')}
          >
            <TabsList className="w-full grid grid-cols-4 h-auto">
              <TabsTrigger value="all" className="text-xs py-1.5">All</TabsTrigger>
              <TabsTrigger value="core" className="text-xs py-1.5">Core</TabsTrigger>
              <TabsTrigger value="functional_collective" className="text-xs py-1.5">Functional</TabsTrigger>
              <TabsTrigger value="relational_emotional" className="text-xs py-1.5">Emotional</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search archetypes..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {isLoading ? 'Loading archetypes...' : 'No archetypes found.'}
            </CommandEmpty>
            
            {categoryFilter === 'all' ? (
              // Show grouped when viewing all
              Object.entries(groupedArchetypes).map(([category, items]) => 
                items.length > 0 && (
                  <CommandGroup 
                    key={category} 
                    heading={ARCHETYPE_CATEGORY_LABELS[category as ArchetypeCategory]}
                  >
                    {items.map((archetype) => (
                      <ArchetypeItem 
                        key={archetype.id} 
                        archetype={archetype} 
                        isSelected={value?.name === archetype.name}
                        onSelect={() => handleSelect(archetype)}
                      />
                    ))}
                  </CommandGroup>
                )
              )
            ) : (
              // Show flat list when filtered
              <CommandGroup>
                {filteredArchetypes.map((archetype) => (
                  <ArchetypeItem 
                    key={archetype.id} 
                    archetype={archetype} 
                    isSelected={value?.name === archetype.name}
                    onSelect={() => handleSelect(archetype)}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ArchetypeItemProps {
  archetype: LibraryArchetype;
  isSelected: boolean;
  onSelect: () => void;
}

function ArchetypeItem({ archetype, isSelected, onSelect }: ArchetypeItemProps) {
  const roleTypeColor = ROLE_TYPE_COLORS[archetype.role_type] || 'bg-muted text-muted-foreground';
  
  return (
    <CommandItem
      value={archetype.name}
      onSelect={onSelect}
      className="flex items-start gap-2 py-2"
    >
      <Check
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{archetype.name}</span>
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", roleTypeColor)}>
            {archetype.role_type}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {archetype.key_traits.slice(0, 3).map((trait, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
              {trait}
            </Badge>
          ))}
        </div>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[300px]">
            <p className="text-xs">{archetype.llm_instruction}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CommandItem>
  );
}
