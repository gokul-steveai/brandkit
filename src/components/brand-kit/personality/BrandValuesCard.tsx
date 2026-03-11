import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LibraryDropdownSelector } from './shared/LibraryDropdownSelector';
import { EditableCard, FieldConfig } from './shared/EditableCard';
import { BrandValueData, LibraryValue } from './shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for backwards compatibility
export type { BrandValueData as BrandValue, LibraryValue };

interface BrandValuesCardProps {
  libraryValues: LibraryValue[];
  selectedValues: BrandValueData[];
  onSelectionChange: (values: BrandValueData[]) => void;
  onValueCreated: (value: LibraryValue) => void;
}

// Transform library item to simplified data structure
function toDataFormat(item: LibraryValue): BrandValueData {
  return {
    name: item.name,
    description: item.description,
  };
}

// Check if a value name is already selected
function isNameSelected(name: string, selected: BrandValueData[]): boolean {
  return selected.some((v) => v.name.toLowerCase() === name.toLowerCase());
}

const VALUE_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g., Integrity' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this value...' },
];

export function BrandValuesCard({
  libraryValues,
  selectedValues,
  onSelectionChange,
  onValueCreated,
}: BrandValuesCardProps) {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Handle library selection - transform and add to selected
  const handleLibrarySelect = (items: LibraryValue[]) => {
    const currentNames = selectedValues.map((v) => v.name.toLowerCase());
    const selectedNames = items.map((i) => i.name.toLowerCase());
    
    const toAdd = items.filter((item) => !currentNames.includes(item.name.toLowerCase()));
    const toKeep = selectedValues.filter((v) => selectedNames.includes(v.name.toLowerCase()));
    
    onSelectionChange([...toKeep, ...toAdd.map(toDataFormat)]);
  };

  // Map selected items back to library format for dropdown
  const librarySelectedItems = libraryValues.filter((lib) =>
    isNameSelected(lib.name, selectedValues)
  );

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('library_brand_values')
        .insert({
          name: newName.trim(),
          description: newDescription.trim() || null,
          is_library: false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newLibraryValue: LibraryValue = {
          id: data.id,
          name: data.name,
          description: data.description,
          is_library: data.is_library,
        };
        onValueCreated(newLibraryValue);
        onSelectionChange([...selectedValues, toDataFormat(newLibraryValue)]);
        setShowCreateDialog(false);
        setNewName('');
        setNewDescription('');
      }
    } catch (error) {
      console.error('Failed to create value:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleValueChange = (index: number, updated: BrandValueData) => {
    const newValues = [...selectedValues];
    newValues[index] = updated;
    onSelectionChange(newValues);
  };

  const removeValue = (index: number) => {
    onSelectionChange(selectedValues.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Values</CardTitle>
        <CardDescription>Core values that guide your brand's decisions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LibraryDropdownSelector
          items={libraryValues}
          selectedItems={librarySelectedItems}
          onSelectionChange={handleLibrarySelect}
          onCreateClick={() => setShowCreateDialog(true)}
          placeholder="Select brand values..."
          maxSelections={5}
        />

        {selectedValues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedValues.map((value, index) => (
              <EditableCard
                key={`${value.name}-${index}`}
                data={value}
                fields={VALUE_FIELDS}
                onChange={(updated) => handleValueChange(index, updated)}
                onRemove={() => removeValue(index)}
                nameField="name"
                previewFields={['description']}
              />
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Brand Value</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Integrity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe this value..."
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
