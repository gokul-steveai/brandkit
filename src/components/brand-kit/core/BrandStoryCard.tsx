import { TextareaCard } from '../shared';

interface BrandStoryCardProps {
  value: string;
  onChange: (value: string) => void;
}

export function BrandStoryCard({ value, onChange }: BrandStoryCardProps) {
  return (
    <TextareaCard
      title="Brand Story"
      description="Tell the narrative of your brand's journey"
      placeholder="Share your brand's origin, challenges overcome, and the journey to where you are today..."
      value={value}
      onChange={onChange}
      rows={8}
    />
  );
}
