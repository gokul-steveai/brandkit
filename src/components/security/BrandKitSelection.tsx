import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

interface BrandKitSelectionProps {
  brandKits: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (kitId: string, checked: boolean) => void;
  disabled: boolean;
}

export function BrandKitSelection({
  brandKits,
  selectedIds,
  onToggle,
  disabled,
}: BrandKitSelectionProps) {
  return (
    <div className="space-y-2">
      <Label>Select Brand Kits</Label>
      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
        {brandKits?.map((kit) => (
          <div key={kit.id} className="flex items-center space-x-2">
            <Checkbox
              id={kit.id}
              checked={selectedIds.includes(kit.id)}
              disabled={disabled}
              onCheckedChange={(checked) => onToggle(kit.id, !!checked)}
            />
            <label htmlFor={kit.id} className="text-sm cursor-pointer">
              {kit.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}