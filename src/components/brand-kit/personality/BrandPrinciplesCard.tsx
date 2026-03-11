import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LibraryDropdownSelector } from './shared/LibraryDropdownSelector';
import { EditableCard, FieldConfig } from './shared/EditableCard';
import { BrandPrincipleData, LibraryPrinciple } from './shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for backwards compatibility
export type { BrandPrincipleData as BrandPrinciple, LibraryPrinciple };

interface BrandPrinciplesCardProps {
  libraryPrinciples: LibraryPrinciple[];
  selectedPrinciples: BrandPrincipleData[];
  onSelectionChange: (principles: BrandPrincipleData[]) => void;
  onPrincipleCreated: (principle: LibraryPrinciple) => void;
}

// Transform library item to simplified data structure
function toDataFormat(item: LibraryPrinciple): BrandPrincipleData {
  return {
    name: item.name,
    action: item.action,
    tags: item.tags,
    use_case: item.use_case,
  };
}

// Check if a principle name is already selected
function isNameSelected(name: string, selected: BrandPrincipleData[]): boolean {
  return selected.some((p) => p.name.toLowerCase() === name.toLowerCase());
}

const PRINCIPLE_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g., Lead with empathy' },
  { key: 'action', label: 'Action', type: 'textarea', placeholder: 'Describe the action this principle drives...' },
  { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'Add tag...' },
  { key: 'use_case', label: 'Use Case', type: 'textarea', placeholder: 'When should this principle be applied...' },
];

export function BrandPrinciplesCard({
  libraryPrinciples,
  selectedPrinciples,
  onSelectionChange,
  onPrincipleCreated,
}: BrandPrinciplesCardProps) {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newUseCase, setNewUseCase] = useState('');

  // Handle library selection - transform and add to selected
  const handleLibrarySelect = (items: LibraryPrinciple[]) => {
    const currentNames = selectedPrinciples.map((p) => p.name.toLowerCase());
    const selectedNames = items.map((i) => i.name.toLowerCase());
    
    const toAdd = items.filter((item) => !currentNames.includes(item.name.toLowerCase()));
    const toKeep = selectedPrinciples.filter((p) => selectedNames.includes(p.name.toLowerCase()));
    
    onSelectionChange([...toKeep, ...toAdd.map(toDataFormat)]);
  };

  // Map selected items back to library format for dropdown
  const librarySelectedItems = libraryPrinciples.filter((lib) =>
    isNameSelected(lib.name, selectedPrinciples)
  );

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;

    setIsCreating(true);
    try {
      const tagsArray = newTags.split(',').map((t) => t.trim()).filter(Boolean);

      const { data, error } = await supabase
        .from('library_brand_principles')
        .insert({
          name: newName.trim(),
          action: newAction.trim() || null,
          tags: tagsArray,
          use_case: newUseCase.trim() || null,
          is_library: false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newLibraryPrinciple: LibraryPrinciple = {
          id: data.id,
          name: data.name,
          action: data.action,
          tags: data.tags,
          use_case: data.use_case,
          is_library: data.is_library,
        };
        onPrincipleCreated(newLibraryPrinciple);
        onSelectionChange([...selectedPrinciples, toDataFormat(newLibraryPrinciple)]);
        setShowCreateDialog(false);
        setNewName('');
        setNewAction('');
        setNewTags('');
        setNewUseCase('');
      }
    } catch (error) {
      console.error('Failed to create principle:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrincipleChange = (index: number, updated: BrandPrincipleData) => {
    const newPrinciples = [...selectedPrinciples];
    newPrinciples[index] = updated;
    onSelectionChange(newPrinciples);
  };

  const removePrinciple = (index: number) => {
    onSelectionChange(selectedPrinciples.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Principles</CardTitle>
        <CardDescription>Guiding principles for how your brand acts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LibraryDropdownSelector
          items={libraryPrinciples}
          selectedItems={librarySelectedItems}
          onSelectionChange={handleLibrarySelect}
          onCreateClick={() => setShowCreateDialog(true)}
          placeholder="Select behavioral principles..."
          maxSelections={5}
        />

        {selectedPrinciples.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedPrinciples.map((principle, index) => (
              <EditableCard
                key={`${principle.name}-${index}`}
                data={principle}
                fields={PRINCIPLE_FIELDS}
                onChange={(updated) => handlePrincipleChange(index, updated)}
                onRemove={() => removePrinciple(index)}
                nameField="name"
                previewFields={['action']}
              />
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Behavioral Principle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Lead with empathy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Textarea
                  id="action"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder="Describe the action this principle drives..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g., communication, customer-service"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="useCase">Use Case</Label>
                <Textarea
                  id="useCase"
                  value={newUseCase}
                  onChange={(e) => setNewUseCase(e.target.value)}
                  placeholder="When should this principle be applied..."
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
