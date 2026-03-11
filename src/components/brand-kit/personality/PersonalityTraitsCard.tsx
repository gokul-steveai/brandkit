import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LibraryDropdownSelector } from './shared/LibraryDropdownSelector';
import { EditableCard, FieldConfig } from './shared/EditableCard';
import { PersonalityTraitData, LibraryTrait } from './shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for backwards compatibility
export type { PersonalityTraitData as PersonalityTrait, LibraryTrait };

interface PersonalityTraitsCardProps {
  libraryTraits: LibraryTrait[];
  selectedTraits: PersonalityTraitData[];
  onSelectionChange: (traits: PersonalityTraitData[]) => void;
  onTraitCreated: (trait: LibraryTrait) => void;
}

// Transform library item to simplified data structure
function toDataFormat(item: LibraryTrait): PersonalityTraitData {
  return {
    title: item.title,
    description: item.description,
    tags: item.tags,
  };
}

// Check if a trait title is already selected
function isTitleSelected(title: string, selected: PersonalityTraitData[]): boolean {
  return selected.some((t) => t.title.toLowerCase() === title.toLowerCase());
}

const TRAIT_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g., Confident' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this trait...' },
  { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'Add tag...' },
];

export function PersonalityTraitsCard({
  libraryTraits,
  selectedTraits,
  onSelectionChange,
  onTraitCreated,
}: PersonalityTraitsCardProps) {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState('');

  // Handle library selection - transform and add to selected
  const handleLibrarySelect = (items: LibraryTrait[]) => {
    const currentTitles = selectedTraits.map((t) => t.title.toLowerCase());
    const selectedTitles = items.map((i) => i.title.toLowerCase());
    
    const toAdd = items.filter((item) => !currentTitles.includes(item.title.toLowerCase()));
    const toKeep = selectedTraits.filter((t) => selectedTitles.includes(t.title.toLowerCase()));
    
    onSelectionChange([...toKeep, ...toAdd.map(toDataFormat)]);
  };

  // Map selected items back to library format for dropdown
  const librarySelectedItems = libraryTraits.filter((lib) =>
    isTitleSelected(lib.title, selectedTraits)
  );

  // Convert library items to dropdown format (needs 'name' field)
  const dropdownItems = libraryTraits.map((t) => ({ ...t, name: t.title }));
  const selectedDropdownItems = librarySelectedItems.map((t) => ({ ...t, name: t.title }));

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;

    setIsCreating(true);
    try {
      const tagsArray = newTags.split(',').map((t) => t.trim()).filter(Boolean);
      
      const { data, error } = await supabase
        .from('library_personality_traits')
        .insert({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          tags: tagsArray,
          is_library: false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newLibraryTrait: LibraryTrait = {
          id: data.id,
          title: data.title,
          description: data.description,
          tags: data.tags,
          is_library: data.is_library,
        };
        onTraitCreated(newLibraryTrait);
        onSelectionChange([...selectedTraits, toDataFormat(newLibraryTrait)]);
        setShowCreateDialog(false);
        setNewTitle('');
        setNewDescription('');
        setNewTags('');
      }
    } catch (error) {
      console.error('Failed to create trait:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTraitChange = (index: number, updated: PersonalityTraitData) => {
    const newTraits = [...selectedTraits];
    newTraits[index] = updated;
    onSelectionChange(newTraits);
  };

  const removeTrait = (index: number) => {
    onSelectionChange(selectedTraits.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personality Traits</CardTitle>
        <CardDescription>Select traits that define your brand's character</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LibraryDropdownSelector
          items={dropdownItems}
          selectedItems={selectedDropdownItems}
          onSelectionChange={(items) => {
            const traits = items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              tags: item.tags,
              is_library: item.is_library,
            }));
            handleLibrarySelect(traits);
          }}
          onCreateClick={() => setShowCreateDialog(true)}
          placeholder="Select personality traits..."
          maxSelections={5}
        />

        {selectedTraits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedTraits.map((trait, index) => (
              <EditableCard
                key={`${trait.title}-${index}`}
                data={trait}
                fields={TRAIT_FIELDS}
                onChange={(updated) => handleTraitChange(index, updated)}
                onRemove={() => removeTrait(index)}
                nameField="title"
                previewFields={['description']}
              />
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Personality Trait</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Confident"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe this trait..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g., bold, strong, assertive"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
