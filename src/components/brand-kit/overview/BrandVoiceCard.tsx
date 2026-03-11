import { TextareaCard } from '../shared';

interface BrandVoiceCardProps {
  value: string;
  onChange: (value: string) => void;
}

export function BrandVoiceCard({ value, onChange }: BrandVoiceCardProps) {
  return (
    <TextareaCard
      title="Brand Voice"
      label="Voice & Tone Guidelines"
      placeholder="Describe how this brand should communicate (e.g., friendly, professional, playful)..."
      value={value}
      onChange={onChange}
      id="brand_voice"
      name="brand_voice"
      className="md:col-span-2"
    />
  );
}
