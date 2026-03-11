// Soft cap for Premium tier (personas, target audiences, competitors)
export const PREMIUM_SOFT_CAP = 20;

// Plan configurations with feature access
export const PLAN_CONFIG = {
  free: {
    name: 'Free',
    price: 0,
    monthlyTokens: 10,
    overagePercent: 10,
    limits: {
      brandKits: 1,
      personas: 1,
      websiteScrapes: 1,
      knowledgeFiles: 0,
      targetAudiences: 1,
      products: 1,
      competitors: 0,
      // Collaboration limits
      editors: 0,
      admins: 1,
      viewers: 0,
    },
    features: {
      core: true,
      personality: true,
      expression: true,
      products: false,
      audience: true,
      governance: false,
      personas: true,
      knowledgeFiles: false,
      visualAssets: false,
      export: true,
      scraping: true,
      social: false,
      competitors: false,
      seoSuggestions: false,
      mcpAccess: false,
    },
  },
  base: {
    name: 'Base',
    price: 19,
    monthlyTokens: 50,
    overagePercent: 10,
    limits: {
      brandKits: 3,
      personas: 2,
      websiteScrapes: 3,
      knowledgeFiles: 5,
      targetAudiences: 3,
      products: 10,
      competitors: 3,
      // Collaboration limits
      editors: 1,
      admins: 1,
      viewers: 10,
    },
    features: {
      core: true,
      personality: true,
      expression: true,
      products: true,
      audience: true,
      governance: true,
      personas: true,
      knowledgeFiles: true,
      visualAssets: true,
      export: true,
      scraping: true,
      social: true,
      competitors: true,
      seoSuggestions: true,
      mcpAccess: false,
    },
  },
  premium: {
    name: 'Premium',
    price: 59,
    monthlyTokens: 150,
    overagePercent: 10,
    limits: {
      brandKits: -1, // unlimited
      personas: -1, // unlimited
      websiteScrapes: -1, // unlimited
      knowledgeFiles: -1, // unlimited
      targetAudiences: -1, // unlimited
      products: -1, // unlimited
      competitors: 10,
      // Collaboration limits
      editors: 5,
      admins: 2,
      viewers: 25,
    },
    features: {
      core: true,
      personality: true,
      expression: true,
      products: true,
      audience: true,
      governance: true,
      personas: true,
      knowledgeFiles: true,
      visualAssets: true,
      export: true,
      scraping: true,
      social: true,
      competitors: true,
      seoSuggestions: true,
      contentCreation: true,
      mcpAccess: true,
    },
  },
} as const;

export type LimitKey = keyof typeof PLAN_CONFIG.free.limits;

// Token costs per operation (maps to edge function names)
export const TOKEN_COSTS: Record<string, number> = {
  'firecrawl-scrape': 1,
  'generate-persona': 1,
  'fill-brand-gaps': 1,
  'export-gpt': 1,
  'generate-gap-questions': 0, // Free
};

// Feature labels for display
export const FEATURE_LABELS: Record<string, string> = {
  core: 'Core Brand Identity',
  personality: 'Brand Personality',
  expression: 'Brand Expression',
  products: 'Products & Services',
  audience: 'Target Audience',
  governance: 'Brand Governance',
  personas: 'AI Personas',
  knowledgeFiles: 'Knowledge Files',
  visualAssets: 'Visual Assets',
  export: 'Export',
  scraping: 'Website Scraping',
  social: 'Social Profiles',
  competitors: 'Competitors',
  seoSuggestions: 'SEO Suggestions',
  contentCreation: 'Content Creation',
  mcpAccess: 'MCP API Access',
};

export type SubscriptionTier = 'free' | 'base' | 'premium';
export type FeatureKey = keyof typeof PLAN_CONFIG.free.features;

// Stripe Price IDs (PRODUCTION - Live)
export const STRIPE_PRICE_IDS = {
  base: 'price_1SpWrxA1Ny6KIZP2yv7G4R20',
  premium: 'price_1SpWs0A1Ny6KIZP25HWKbYlk',
  tokens_10: 'price_1SpWs1A1Ny6KIZP2Qoo5LR2x',
  tokens_25: 'price_1SpWs4A1Ny6KIZP2fDTkm9jf',
  tokens_50: 'price_1SpWs6A1Ny6KIZP2sC9WBYdt',
} as const;

// Stripe Product IDs (PRODUCTION - Live)
export const STRIPE_PRODUCT_IDS = {
  free: 'prod_Tn76uwKTF9Gr5O',
  base: 'prod_Tn76wiubcIo6K9',
  premium: 'prod_Tn768X9tAAxGJs',
} as const;

// Token packs for purchase
export const TOKEN_PACKS = [
  { id: 'tokens_10', tokens: 10, price: 5, priceId: STRIPE_PRICE_IDS.tokens_10 },
  { id: 'tokens_25', tokens: 25, price: 10, priceId: STRIPE_PRICE_IDS.tokens_25 },
  { id: 'tokens_50', tokens: 50, price: 18, priceId: STRIPE_PRICE_IDS.tokens_50 },
] as const;
