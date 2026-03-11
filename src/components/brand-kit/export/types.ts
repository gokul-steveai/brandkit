// Section definitions - modular and expandable
export interface ExportSection {
  id: string;
  name: string;
  description: string;
  icon: string;
  dataSource: 'brand_kits' | 'brand_kit_core' | 'brand_kit_personality' | 
              'brand_kit_expression' | 'brand_kit_governance' | 
              'brand_kit_products' | 'brand_kit_target_audience';
  requiredFields: string[];
  optionalFields: string[];
}

export const EXPORT_SECTIONS: ExportSection[] = [
  {
    id: 'basics',
    name: 'Brand Basics',
    description: 'Name, tagline, description, colors, and visual identity',
    icon: 'Palette',
    dataSource: 'brand_kits',
    requiredFields: ['name'],
    optionalFields: ['tagline', 'description', 'primary_color', 'secondary_color', 'logo_url']
  },
  {
    id: 'core',
    name: 'Core Identity',
    description: 'Mission, vision, brand story, and promises',
    icon: 'Target',
    dataSource: 'brand_kit_core',
    requiredFields: [],
    optionalFields: ['mission', 'vision', 'brand_story', 'brand_promises']
  },
  {
    id: 'personality',
    name: 'Personality',
    description: 'Traits, values, principles, and moods',
    icon: 'Heart',
    dataSource: 'brand_kit_personality',
    requiredFields: [],
    optionalFields: ['personality_traits', 'brand_values', 'brand_principles', 'brand_moods']
  },
  {
    id: 'expression',
    name: 'Expression',
    description: 'Tone of voice, verbal style, and terminology',
    icon: 'MessageSquare',
    dataSource: 'brand_kit_expression',
    requiredFields: [],
    optionalFields: ['tone_of_voice', 'verbal_style', 'preferred_terminology']
  },
  {
    id: 'governance',
    name: 'Governance',
    description: 'Usage guidelines, constraints, and policies',
    icon: 'Shield',
    dataSource: 'brand_kit_governance',
    requiredFields: [],
    optionalFields: ['usage_guidelines', 'behavioral_constraints', 'negative_directory']
  },
  {
    id: 'products',
    name: 'Products & Services',
    description: 'Product catalog with USPs and benefits',
    icon: 'Package',
    dataSource: 'brand_kit_products',
    requiredFields: [],
    optionalFields: []
  },
  {
    id: 'audience',
    name: 'Target Audience',
    description: 'Personas, demographics, and behaviors',
    icon: 'Users',
    dataSource: 'brand_kit_target_audience',
    requiredFields: [],
    optionalFields: []
  }
];

// Section completeness tracking
export interface SectionCompleteness {
  sectionId: string;
  completenessPercent: number;
  filledFields: string[];
  missingFields: string[];
  hasData: boolean;
}

// Gap filling modes
export type GapFillingMode = 'ai_auto' | 'guided_qa' | 'skip';

// Visual Identity export mode
export type VisualIdentityExportMode = 'full' | 'core_colors_only' | 'none';

// Knowledge file recommendation from export
export interface KnowledgeFileRecommendation {
  referenceName: string;
  displayName: string;
  description: string;
  fileType: 'curated_template' | 'auto_generated';
  systemInstructionHint: string;
}

// Export configuration - simplified with persona selection
export interface GPTExportConfig {
  // Section selection
  selectedSections: string[];
  sectionCompleteness: SectionCompleteness[];
  
  // Gap filling
  gapFillingMode: GapFillingMode;
  gapsToFill: string[];
  filledGaps: Record<string, unknown>;
  
  // Persona selection (replaces purpose/tasks/tone/behavior)
  selectedPersonaId: string | null;
  
  // Restrictions (still applies to system instructions)
  restrictions: string[];
  restrictionsCustom?: string;
  
  // Visual Identity export mode
  visualIdentityMode: VisualIdentityExportMode;

  // Knowledge file selection
  selectedKnowledgeFileIds: string[];
}

// Export metadata for storage
export interface ExportMetadata {
  title: string;
  description: string;
  referenceName: string;
  exportType: 'chatgpt_custom_gpt';
  exportFormat: 'markdown' | 'json';
  sectionsIncluded: string[];
  exportConfig: GPTExportConfig;
  gapsFilled: string[];
  metaTags: string[];
  contentSummary?: string;
}

// Generated export content - now with separate user prompt template
export interface GPTExportResult {
  systemInstructions: string;
  userPromptTemplate: string;
  knowledgeFile: Record<string, unknown>;
  recommendedKnowledgeFiles: KnowledgeFileRecommendation[];
  conversationStarters: string[];
  metadata: ExportMetadata;
}

// Gap question for guided Q&A
export interface GapQuestion {
  id: string;
  sectionId: string;
  field: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
}

// Default export config
export const DEFAULT_GPT_EXPORT_CONFIG: GPTExportConfig = {
  selectedSections: ['basics', 'core', 'personality', 'expression'],
  sectionCompleteness: [],
  gapFillingMode: 'skip',
  gapsToFill: [],
  filledGaps: {},
  selectedPersonaId: null,
  restrictions: [],
  visualIdentityMode: 'full',
  selectedKnowledgeFileIds: [],
};

// Restriction options for the wizard
export const GPT_RESTRICTION_OPTIONS = [
  { id: 'no_competitors', label: 'Never mention competitors' },
  { id: 'no_pricing', label: 'Avoid discussing pricing details' },
  { id: 'no_promises', label: 'Don\'t make guarantees or promises' },
  { id: 'no_sensitive', label: 'Avoid sensitive topics' },
  { id: 'no_jargon', label: 'Minimize industry jargon' },
  { id: 'no_humor', label: 'Avoid humor or jokes' },
];

// Claude Skill Export Types
export interface ClaudeSkillExportConfig {
  selectedSections: string[];
  includeLogos: boolean;
  includeFonts: boolean;
  includeKnowledgeFiles: boolean;
  selectedTemplateIds: string[];
  selectedScriptIds?: string[]; // Reserved for future executable scripts
}

export const DEFAULT_CLAUDE_SKILL_CONFIG: ClaudeSkillExportConfig = {
  selectedSections: ['basics', 'core', 'personality', 'expression'],
  includeLogos: true,
  includeFonts: true,
  includeKnowledgeFiles: true,
  selectedTemplateIds: [],
};

export interface ClaudeSkillExportResult {
  skillMd: string;
  zipBase64: string;
  description: string;
  metadata: {
    brandName: string;
    generatedAt: string;
    sectionsIncluded: string[];
    filesIncluded: string[];
  };
}

// Markdown Export Types
export interface MarkdownExportConfig {
  selectedSections: string[];
  includeVisualIdentity: boolean;
  selectedTemplateIds: string[];
}

export const DEFAULT_MARKDOWN_EXPORT_CONFIG: MarkdownExportConfig = {
  selectedSections: ['basics', 'core', 'personality', 'expression', 'governance', 'products', 'audience'],
  includeVisualIdentity: true,
  selectedTemplateIds: [],
};

export interface MarkdownExportResult {
  zipBase64: string;
  files: Record<string, string>;
  metadata: {
    brandName: string;
    generatedAt: string;
    sectionsIncluded: string[];
    filesIncluded: string[];
  };
}
