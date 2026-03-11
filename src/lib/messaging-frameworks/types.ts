export type EmotionalLoad = 'low' | 'medium' | 'high';
export type EthicalRisk = 'low' | 'medium' | 'high';
export type ReferenceType = 'person' | 'thing' | 'context' | 'proof' | 'constraint';
export type AudienceAwareness = 'unaware' | 'problem-aware' | 'solution-aware' | 'product-aware' | 'most-aware' | 'any';
export type SelectionMethod = 'manual' | 'ai_recommended';

export interface FrameworkReference {
  name: string;
  type: ReferenceType;
  description: string;
}

export interface ExecutionStep {
  step: number;
  label: string;
  instruction: string;
}

export interface MessagingFramework {
  id: string;
  name: string;
  description: string;
  userGoals: string[];
  contentFormats: string[];
  audienceAwarenessLevels: AudienceAwareness[];
  emotionalLoad: EmotionalLoad;
  ethicalRisk: EthicalRisk;
  requiredReferences: FrameworkReference[];
  optionalReferences: FrameworkReference[];
  variableInventory: {
    people: string[];
    things: string[];
    contexts: string[];
  };
  executionSteps: ExecutionStep[];
  failureModes: string[];
  outputLengthAffinity: string[];
  brandVoiceSensitivity: string;
  exampleContext?: string;
  exampleSampleOutput?: string;
}

export interface FrameworkSelectionResult {
  frameworks: MessagingFramework[];
  reasoning?: string;
}

export interface BrandKitDataCompleteness {
  hasPersona: boolean;
  hasPainPoints: boolean;
  hasGoals: boolean;
  hasProduct: boolean;
  hasProductDescription: boolean;
  hasBrandStory: boolean;
  hasToneOfVoice: boolean;
  hasBrandValues: boolean;
  missingRequired: string[];
  missingSoftRecommended: string[];
  completenessScore: number;
  canGenerate: boolean;
}

export interface GenerationConfig {
  primaryPersonaId?: string;
  primaryProductId?: string;
  selectedFrameworkIds: string[];
  selectionMethod: SelectionMethod;
}

export interface MessagingFrameworkSpec {
  id: string;
  brandKitId: string;
  userId: string;
  version: number;
  title: string;
  selectedFrameworks: string[];
  selectionMethod: SelectionMethod;
  contentMarkdown: string;
  contentJson?: Record<string, unknown>;
  generationConfig: GenerationConfig;
  tokensUsed: number;
  createdAt: string;
}
