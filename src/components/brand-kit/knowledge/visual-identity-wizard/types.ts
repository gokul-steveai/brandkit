export interface ExtractedColor {
  id: string;
  hex: string;
  name: string;
  source: 'css' | 'html' | 'branding' | 'manual';
  isSelected: boolean;
}

export interface CoreColorAssignment {
  role: 'primary' | 'secondary' | 'accent' | 'background' | 'custom_1' | 'custom_2' | 'custom_3' | 'custom_4';
  color: ExtractedColor | null;
  customName?: string;
  description?: string;
  useWhen?: string;
}

export interface VisualIdentityWizardState {
  step: 'source' | 'preview' | 'assign' | 'metadata';
  extractedColors: ExtractedColor[];
  coreAssignments: CoreColorAssignment[];
  extendedColors: ExtractedColor[];
  isExtracting: boolean;
  sourceType: 'file' | 'url' | 'existing' | null;
  sourceUrl?: string;
}

export const DEFAULT_CORE_ASSIGNMENTS: CoreColorAssignment[] = [
  { role: 'primary', color: null, description: '', useWhen: '' },
  { role: 'secondary', color: null, description: '', useWhen: '' },
  { role: 'accent', color: null, description: '', useWhen: '' },
  { role: 'background', color: null, description: '', useWhen: '' },
];

export const CUSTOM_SLOTS: CoreColorAssignment['role'][] = ['custom_1', 'custom_2', 'custom_3', 'custom_4'];

export const ROLE_LABELS: Record<CoreColorAssignment['role'], string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  background: 'Background',
  custom_1: 'Custom 1',
  custom_2: 'Custom 2',
  custom_3: 'Custom 3',
  custom_4: 'Custom 4',
};
