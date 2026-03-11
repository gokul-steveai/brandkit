export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'data-check',
    title: 'Data Check',
    description: 'Verify required brand data'
  },
  {
    id: 'framework-selection',
    title: 'Select Frameworks',
    description: 'Choose messaging frameworks'
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Confirm and generate'
  }
];

export interface PersonaOption {
  id: string;
  name: string;
  isPrimary: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
}
