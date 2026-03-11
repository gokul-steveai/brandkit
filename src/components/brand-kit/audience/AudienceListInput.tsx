import { ListInputCard } from '@/components/brand-kit/shared';
import { Persona } from './types';

interface AudienceListInputProps {
  label: string;
  items: string[];
  field: keyof Persona;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  onAdd: (field: keyof Persona, value: string, setter: (v: string) => void) => void;
  onRemove: (field: keyof Persona, index: number) => void;
}

export function AudienceListInput({
  label,
  items,
  field,
  value,
  setValue,
  placeholder,
  onAdd,
  onRemove
}: AudienceListInputProps) {
  return (
    <ListInputCard
      label={label}
      items={items}
      value={value}
      setValue={setValue}
      placeholder={placeholder}
      onAdd={() => onAdd(field, value, setValue)}
      onRemove={(index) => onRemove(field, index)}
    />
  );
}
