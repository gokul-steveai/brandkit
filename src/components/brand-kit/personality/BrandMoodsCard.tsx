import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LibraryDropdownSelector } from './shared/LibraryDropdownSelector';
import { EditableCard, FieldConfig } from './shared/EditableCard';
import { BrandMoodData, LibraryMood } from './shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for backwards compatibility
export type { BrandMoodData as BrandMood, LibraryMood };

interface BrandMoodsCardProps {
  libraryMoods: LibraryMood[];
  selectedMoods: BrandMoodData[];
  onSelectionChange: (moods: BrandMoodData[]) => void;
  onMoodCreated: (mood: LibraryMood) => void;
}

// Transform library item to simplified data structure
function toDataFormat(item: LibraryMood): BrandMoodData {
  return {
    name: item.name,
    emotional_description: item.emotional_description,
    visual_descriptor: item.visual_descriptor,
    associated_tone: item.associated_tone,
  };
}

// Check if a mood name is already selected
function isNameSelected(name: string, selected: BrandMoodData[]): boolean {
  return selected.some((m) => m.name.toLowerCase() === name.toLowerCase());
}

const MOOD_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g., Confident' },
  { key: 'emotional_description', label: 'Emotional Description', type: 'textarea', placeholder: 'Describe the emotional quality...' },
  { key: 'visual_descriptor', label: 'Visual Descriptor', type: 'text', placeholder: 'e.g., Bold colors, strong typography' },
  { key: 'associated_tone', label: 'Associated Tone', type: 'text', placeholder: 'e.g., Direct and assertive' },
];

export function BrandMoodsCard({
  libraryMoods,
  selectedMoods,
  onSelectionChange,
  onMoodCreated,
}: BrandMoodsCardProps) {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmotionalDescription, setNewEmotionalDescription] = useState('');
  const [newVisualDescriptor, setNewVisualDescriptor] = useState('');
  const [newAssociatedTone, setNewAssociatedTone] = useState('');

  // Handle library selection - transform and add to selected
  const handleLibrarySelect = (items: LibraryMood[]) => {
    const currentNames = selectedMoods.map((m) => m.name.toLowerCase());
    const selectedNames = items.map((i) => i.name.toLowerCase());
    
    const toAdd = items.filter((item) => !currentNames.includes(item.name.toLowerCase()));
    const toKeep = selectedMoods.filter((m) => selectedNames.includes(m.name.toLowerCase()));
    
    onSelectionChange([...toKeep, ...toAdd.map(toDataFormat)]);
  };

  // Map selected items back to library format for dropdown
  const librarySelectedItems = libraryMoods.filter((lib) =>
    isNameSelected(lib.name, selectedMoods)
  );

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('library_brand_moods')
        .insert({
          name: newName.trim(),
          emotional_description: newEmotionalDescription.trim() || null,
          visual_descriptor: newVisualDescriptor.trim() || null,
          associated_tone: newAssociatedTone.trim() || null,
          is_library: false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newLibraryMood: LibraryMood = {
          id: data.id,
          name: data.name,
          emotional_description: data.emotional_description,
          visual_descriptor: data.visual_descriptor,
          associated_tone: data.associated_tone,
          is_library: data.is_library,
        };
        onMoodCreated(newLibraryMood);
        onSelectionChange([...selectedMoods, toDataFormat(newLibraryMood)]);
        setShowCreateDialog(false);
        setNewName('');
        setNewEmotionalDescription('');
        setNewVisualDescriptor('');
        setNewAssociatedTone('');
      }
    } catch (error) {
      console.error('Failed to create mood:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleMoodChange = (index: number, updated: BrandMoodData) => {
    const newMoods = [...selectedMoods];
    newMoods[index] = updated;
    onSelectionChange(newMoods);
  };

  const removeMood = (index: number) => {
    onSelectionChange(selectedMoods.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Moods</CardTitle>
        <CardDescription>Emotional tones your brand conveys</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LibraryDropdownSelector
          items={libraryMoods}
          selectedItems={librarySelectedItems}
          onSelectionChange={handleLibrarySelect}
          onCreateClick={() => setShowCreateDialog(true)}
          placeholder="Select brand moods..."
          maxSelections={3}
        />

        {selectedMoods.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedMoods.map((mood, index) => (
              <EditableCard
                key={`${mood.name}-${index}`}
                data={mood}
                fields={MOOD_FIELDS}
                onChange={(updated) => handleMoodChange(index, updated)}
                onRemove={() => removeMood(index)}
                nameField="name"
                previewFields={['emotional_description']}
              />
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Brand Mood</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Confident"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emotionalDescription">Emotional Description</Label>
                <Textarea
                  id="emotionalDescription"
                  value={newEmotionalDescription}
                  onChange={(e) => setNewEmotionalDescription(e.target.value)}
                  placeholder="Describe the emotional quality..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visualDescriptor">Visual Descriptor</Label>
                <Input
                  id="visualDescriptor"
                  value={newVisualDescriptor}
                  onChange={(e) => setNewVisualDescriptor(e.target.value)}
                  placeholder="e.g., Bold colors, strong typography"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="associatedTone">Associated Tone</Label>
                <Input
                  id="associatedTone"
                  value={newAssociatedTone}
                  onChange={(e) => setNewAssociatedTone(e.target.value)}
                  placeholder="e.g., Direct and assertive"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || isCreating}
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
