import { TextareaCard } from '../shared';

interface AISummaryCardProps {
  value: string;
  onChange: (value: string) => void;
}

export function AISummaryCard({ value, onChange }: AISummaryCardProps) {
  return (
    <TextareaCard
      title="AI Summary"
      label="Extracted Summary"
      placeholder="AI-generated summary of the brand..."
      value={value}
      onChange={onChange}
      id="summary"
      name="summary"
    />
  );
}
