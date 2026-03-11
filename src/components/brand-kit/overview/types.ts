// Brand color types for the extensible color system

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
  role: 'primary' | 'secondary' | 'accent' | 'background' | 'custom';
  description?: string;
  useWhen?: string;
  order: number;
}

export interface ExtendedColor {
  id: string;
  name: string;
  hex: string;
}

export interface ColorFormData {
  name: string;
  hex: string;
  description: string;
  useWhen: string;
}

export interface ColorMetadataEntry {
  description?: string;
  useWhen?: string;
}

export interface ColorMetadata {
  [slotKey: string]: ColorMetadataEntry;
}

// Color details types for the new unified color_details JSONB column
export interface ColorModeEntry {
  hex: string;
  description?: string;
  useWhen?: string;
}

export interface ColorDetailEntry {
  name?: string;
  light?: ColorModeEntry;
  dark?: ColorModeEntry;
}

export interface ColorDetails {
  [role: string]: ColorDetailEntry;
}

// Core colors are stored in dedicated columns
export const CORE_COLOR_ROLES = ['primary', 'secondary', 'accent', 'background'] as const;
export const CUSTOM_COLOR_SLOTS = ['custom_1', 'custom_2', 'custom_3', 'custom_4'] as const;

export type CoreColorRole = typeof CORE_COLOR_ROLES[number];
export type CustomColorSlot = typeof CUSTOM_COLOR_SLOTS[number];
