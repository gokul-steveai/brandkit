export interface VisualAsset {
  id: string;
  brand_kit_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  public_url: string | null;
  file_size_bytes: number;
  mime_type: string;
  asset_type: AssetType;
  title: string | null;
  description: string | null;
  ai_analysis: AIAnalysis | null;
  tags: string[];
  expires_at: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export type AssetType = 'logo' | 'product' | 'color' | 'icon' | 'pattern' | 'photo' | 'other';

export interface AIAnalysis {
  subjectAction: string;
  setting: string;
  lighting: string;
  camera: string;
  composition: string;
  colorPalette: {
    topColors: Array<{
      name: string;
      hex: string;
      hsl: string;
      percentage: string;
    }>;
    additionalColors: string;
  };
  moodStyle: string;
  characterDetails?: string;
  objectInventory?: string;
}

export interface ExpirationOption {
  label: string;
  value: number | null;
}

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'product', label: 'Product' },
  { value: 'color', label: 'Colors/Palette' },
  { value: 'icon', label: 'Icon' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { label: 'Never expires', value: null },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
];

export const VISUAL_ASSET_CONFIG = {
  BUCKET: 'user-visual-assets',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

export const STORAGE_LIMITS: Record<string, number> = {
  free: 25 * 1024 * 1024,           // 25 MB
  base: 500 * 1024 * 1024,          // 500 MB
  premium: 2 * 1024 * 1024 * 1024,  // 2 GB
};
