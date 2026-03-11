import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SaveStatusHeaderProps {
  autoSaveEnabled: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function SaveStatusHeader({
  autoSaveEnabled,
  hasUnsavedChanges,
  isSaving,
  onSave,
}: SaveStatusHeaderProps) {
  // Don't render if auto-save is enabled
  if (autoSaveEnabled) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isSaving && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {!isSaving && hasUnsavedChanges && (
          <span>Unsaved changes</span>
        )}
        {!isSaving && !hasUnsavedChanges && (
          <span>All changes saved</span>
        )}
      </div>
      <Button 
        onClick={onSave} 
        disabled={isSaving || !hasUnsavedChanges}
        variant="outline"
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Saving...' : 'Save Now'}
      </Button>
    </div>
  );
}
