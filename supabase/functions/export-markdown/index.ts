import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

interface ExportFile {
  path: string;
  content: string;
  isText: boolean;
}

interface MarkdownExportConfig {
  selectedSections: string[];
  includeVisualIdentity: boolean;
  selectedTemplateIds?: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOKEN_COST = 1;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

interface TokenResult {
  allowed: boolean;
  tokensRemaining: number;
  message?: string;
}

async function checkRateLimit(
  supabase: any,
  userId: string,
  functionName: string
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .single();

  if (!existing) {
    await supabase.from('rate_limits').insert({
      user_id: userId,
      function_name: functionName,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS) };
  }

  const recordWindowStart = new Date(existing.window_start);
  
  if (recordWindowStart < windowStart) {
    await supabase
      .from('rate_limits')
      .update({ request_count: 1, window_start: now.toISOString() })
      .eq('id', existing.id);
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS) };
  }

  if (existing.request_count >= RATE_LIMIT_MAX) {
    const resetAt = new Date(recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MS);
    return { allowed: false, remaining: 0, resetAt };
  }

  await supabase
    .from('rate_limits')
    .update({ request_count: existing.request_count + 1 })
    .eq('id', existing.id);

  const resetAt = new Date(recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MS);
  return { allowed: true, remaining: RATE_LIMIT_MAX - existing.request_count - 1, resetAt };
}

async function checkAndDeductTokens(
  supabase: any,
  userId: string,
  tokenCost: number,
  functionName: string,
  brandKitId?: string
): Promise<TokenResult> {
  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !subscription) {
    const { error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        subscription_tier: 'free',
        tokens_balance: 10,
        monthly_token_allowance: 10,
      });
    
    if (createError) {
      return { allowed: false, tokensRemaining: 0, message: 'Failed to create subscription' };
    }
    
    return checkAndDeductTokens(supabase, userId, tokenCost, functionName, brandKitId);
  }

  const maxOverage = Math.floor(subscription.monthly_token_allowance * (subscription.overage_limit_percent / 100));
  const minBalance = -maxOverage;

  if (subscription.tokens_balance - tokenCost < minBalance) {
    return { 
      allowed: false, 
      tokensRemaining: subscription.tokens_balance,
      message: `Insufficient tokens. Balance: ${subscription.tokens_balance}, Required: ${tokenCost}. Upgrade your plan for more tokens.`
    };
  }

  const newBalance = subscription.tokens_balance - tokenCost;
  const newUsed = subscription.tokens_used_this_period + tokenCost;

  await supabase
    .from('user_subscriptions')
    .update({ 
      tokens_balance: newBalance,
      tokens_used_this_period: newUsed,
    })
    .eq('user_id', userId);

  await supabase.from('token_transactions').insert({
    user_id: userId,
    transaction_type: 'api_usage',
    tokens_amount: -tokenCost,
    tokens_balance_after: newBalance,
    description: `API call: ${functionName}`,
    function_name: functionName,
    brand_kit_id: brandKitId || null,
    metadata: { function: functionName, cost: tokenCost },
  });

  return { allowed: true, tokensRemaining: newBalance };
}

async function verifyBrandKitOwnership(
  supabase: any,
  brandKitId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("brand_kits")
    .select("user_id")
    .eq("id", brandKitId)
    .single();

  if (error || !data) return false;
  return data.user_id === userId;
}

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// CRC32 implementation for ZIP
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function createZipBase64(files: ExportFile[]): Promise<string> {
  const textEncoder = new TextEncoder();
  const localFileHeaders: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let offset = 0;
  
  for (const file of files) {
    const fileNameBytes = textEncoder.encode(file.path);
    let contentBytes: Uint8Array;
    
    if (file.isText) {
      contentBytes = textEncoder.encode(file.content);
    } else {
      const binaryString = atob(file.content);
      contentBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        contentBytes[i] = binaryString.charCodeAt(i);
      }
    }
    
    const crc = crc32(contentBytes);
    
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);
    
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, fileNameBytes.length, true);
    localView.setUint16(28, 0, true);
    
    localHeader.set(fileNameBytes, 30);
    
    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, fileNameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    
    centralHeader.set(fileNameBytes, 46);
    
    localFileHeaders.push(localHeader, contentBytes);
    centralDirectoryHeaders.push(centralHeader);
    
    offset += localHeader.length + contentBytes.length;
  }
  
  const centralDirectorySize = centralDirectoryHeaders.reduce((sum, h) => sum + h.length, 0);
  
  const endOfCentralDirectory = new Uint8Array(22);
  const endView = new DataView(endOfCentralDirectory.buffer);
  
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);
  
  const totalSize = offset + centralDirectorySize + 22;
  const zipData = new Uint8Array(totalSize);
  let writeOffset = 0;
  
  for (const part of localFileHeaders) {
    zipData.set(part, writeOffset);
    writeOffset += part.length;
  }
  
  for (const header of centralDirectoryHeaders) {
    zipData.set(header, writeOffset);
    writeOffset += header.length;
  }
  
  zipData.set(endOfCentralDirectory, writeOffset);
  
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < zipData.length; i += chunkSize) {
    const chunk = zipData.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

// Helper to format array data
function formatArrayAsMarkdown(arr: unknown[], itemFormatter?: (item: unknown) => string): string {
  if (!arr || arr.length === 0) return '_No data available_';
  
  return arr.map((item, index) => {
    if (itemFormatter) {
      return `${index + 1}. ${itemFormatter(item)}`;
    }
    if (typeof item === 'string') {
      return `- ${item}`;
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      if (obj.name || obj.title) {
        const name = obj.name || obj.title;
        const desc = obj.description || '';
        return `### ${name}\n${desc}`;
      }
      return `- ${JSON.stringify(item)}`;
    }
    return `- ${String(item)}`;
  }).join('\n\n');
}

// Generate README.md
function generateReadme(brandKit: Record<string, unknown>, config: MarkdownExportConfig): string {
  let content = `# ${brandKit.name || 'Brand Kit'}\n\n`;
  
  if (brandKit.tagline) {
    content += `> ${brandKit.tagline}\n\n`;
  }
  
  if (brandKit.description) {
    content += `## About\n\n${brandKit.description}\n\n`;
  }
  
  if (brandKit.website_url) {
    content += `**Website:** ${brandKit.website_url}\n\n`;
  }
  
  if (config.includeVisualIdentity) {
    content += `## Visual Identity\n\n`;
    
    // Read from color_details (new unified column), fall back to flat columns
    const cd = brandKit.color_details || {};
    const hasColorDetails = Object.keys(cd).some((k: string) => cd[k]?.light?.hex);

    if (hasColorDetails) {
      content += `### Brand Colors\n\n`;
      const roleLabels: Record<string, string> = {
        primary: 'Primary', secondary: 'Secondary', accent: 'Accent',
        background: 'Background', text_primary: 'Text Primary',
        text_secondary: 'Text Secondary', link: 'Links',
      };
      for (const [role, data] of Object.entries(cd) as [string, any][]) {
        if (data?.light?.hex) {
          const label = data.name || roleLabels[role] || role;
          content += `- **${label}:** ${data.light.hex}`;
          if (data.light.description) content += ` — ${data.light.description}`;
          content += '\n';
        }
      }
      content += '\n';
    } else if (brandKit.primary_color || brandKit.secondary_color || brandKit.accent_color) {
      content += `### Brand Colors\n\n`;
      if (brandKit.primary_color) content += `- **Primary:** ${brandKit.primary_color}\n`;
      if (brandKit.secondary_color) content += `- **Secondary:** ${brandKit.secondary_color}\n`;
      if (brandKit.accent_color) content += `- **Accent:** ${brandKit.accent_color}\n`;
      if (brandKit.background_color) content += `- **Background:** ${brandKit.background_color}\n`;
      if (brandKit.text_primary_color) content += `- **Text Primary:** ${brandKit.text_primary_color}\n`;
      content += '\n';
    }
    
    if (brandKit.heading_font || brandKit.body_font) {
      content += `### Typography\n\n`;
      if (brandKit.heading_font) content += `- **Heading Font:** ${brandKit.heading_font}\n`;
      if (brandKit.body_font) content += `- **Body Font:** ${brandKit.body_font}\n`;
      content += '\n';
    }
  }
  
  content += `---\n*Exported from ${brandKit.name} Brand Kit on ${new Date().toLocaleDateString()}*\n`;
  
  return content;
}

// Generate consolidated core.md file
function generateCoreFile(core: Record<string, unknown> | null): string {
  let content = `# Core Identity\n\n`;
  
  // Mission
  content += `## Mission Statement\n\n`;
  if (core?.mission) {
    content += `${core.mission}\n\n`;
  } else {
    content += `_No mission defined yet._\n\n`;
  }
  
  // Vision
  content += `## Vision Statement\n\n`;
  if (core?.vision) {
    content += `${core.vision}\n\n`;
  } else {
    content += `_No vision defined yet._\n\n`;
  }
  
  // Brand Story
  content += `## Brand Story\n\n`;
  if (core?.brand_story) {
    content += `${core.brand_story}\n\n`;
  } else {
    content += `_No brand story defined yet._\n\n`;
  }
  
  // Brand Promises
  content += `## Brand Promises\n\n`;
  const promisesData = core?.brand_promises as unknown[] | null;
  if (promisesData && Array.isArray(promisesData) && promisesData.length > 0) {
    content += formatArrayAsMarkdown(promisesData);
  } else {
    content += `_No brand promises defined yet._`;
  }
  content += '\n';
  
  return content;
}

// Generate consolidated personality.md file
function generatePersonalityFile(personality: Record<string, unknown> | null): string {
  let content = `# Brand Personality\n\n`;
  
  // Values
  content += `## Brand Values\n\n`;
  const valuesData = personality?.brand_values as unknown[] | null;
  if (valuesData && Array.isArray(valuesData) && valuesData.length > 0) {
    content += formatArrayAsMarkdown(valuesData);
  } else {
    content += `_No brand values defined yet._`;
  }
  content += '\n\n';
  
  // Traits
  content += `## Personality Traits\n\n`;
  const traitsData = personality?.personality_traits as unknown[] | null;
  if (traitsData && Array.isArray(traitsData) && traitsData.length > 0) {
    content += formatArrayAsMarkdown(traitsData);
  } else {
    content += `_No personality traits defined yet._`;
  }
  content += '\n\n';
  
  // Principles
  content += `## Brand Principles\n\n`;
  const principlesData = personality?.brand_principles as unknown[] | null;
  if (principlesData && Array.isArray(principlesData) && principlesData.length > 0) {
    content += formatArrayAsMarkdown(principlesData);
  } else {
    content += `_No brand principles defined yet._`;
  }
  content += '\n\n';
  
  // Moods
  content += `## Brand Moods\n\n`;
  const moodsData = personality?.brand_moods as unknown[] | null;
  if (moodsData && Array.isArray(moodsData) && moodsData.length > 0) {
    content += formatArrayAsMarkdown(moodsData);
  } else {
    content += `_No brand moods defined yet._`;
  }
  content += '\n';
  
  return content;
}

// Generate consolidated expression.md file
function generateExpressionFile(expression: Record<string, unknown> | null): string {
  let content = `# Brand Expression\n\n`;
  
  // Tone of Voice
  content += `## Tone of Voice\n\n`;
  const toneData = expression?.tone_of_voice;
  if (toneData) {
    if (Array.isArray(toneData)) {
      content += formatArrayAsMarkdown(toneData);
    } else if (typeof toneData === 'object') {
      const toneObj = toneData as Record<string, unknown>;
      Object.entries(toneObj).forEach(([key, value]) => {
        content += `### ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n${value}\n\n`;
      });
    } else {
      content += `${toneData}\n`;
    }
  } else {
    content += `_No tone of voice defined yet._`;
  }
  content += '\n\n';
  
  // Voice Archetypes
  content += `## Voice Archetypes\n\n`;
  const archetypesData = expression?.voice_archetypes as unknown[] | null;
  if (archetypesData && Array.isArray(archetypesData) && archetypesData.length > 0) {
    content += formatArrayAsMarkdown(archetypesData);
  } else {
    content += `_No voice archetypes defined yet._`;
  }
  content += '\n\n';
  
  // Verbal Style
  content += `## Verbal Style\n\n`;
  const verbalData = expression?.verbal_style;
  if (verbalData) {
    if (typeof verbalData === 'object') {
      const verbalObj = verbalData as Record<string, unknown>;
      Object.entries(verbalObj).forEach(([key, value]) => {
        content += `### ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n${value}\n\n`;
      });
    } else {
      content += `${verbalData}\n`;
    }
  } else {
    content += `_No verbal style defined yet._`;
  }
  content += '\n\n';
  
  // Terminology
  content += `## Preferred Terminology\n\n`;
  const termData = expression?.preferred_terminology;
  if (termData && Array.isArray(termData) && termData.length > 0) {
    content += `| Term | Definition | Context |\n|------|------------|--------|\n`;
    termData.forEach((term: { term?: string; definition?: string; context?: string }) => {
      content += `| ${term.term || '-'} | ${term.definition || '-'} | ${term.context || '-'} |\n`;
    });
  } else {
    content += `_No terminology defined yet._`;
  }
  content += '\n';
  
  return content;
}

// Generate consolidated governance.md file
function generateGovernanceFile(governance: Record<string, unknown> | null): string {
  let content = `# Governance\n\n`;
  
  // Usage Guidelines
  content += `## Usage Guidelines\n\n`;
  const guidelinesData = governance?.usage_guidelines;
  if (guidelinesData) {
    if (Array.isArray(guidelinesData)) {
      content += formatArrayAsMarkdown(guidelinesData);
    } else if (typeof guidelinesData === 'object') {
      const obj = guidelinesData as Record<string, unknown>;
      Object.entries(obj).forEach(([key, value]) => {
        content += `### ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n${value}\n\n`;
      });
    } else {
      content += `${guidelinesData}\n`;
    }
  } else {
    content += `_No usage guidelines defined yet._`;
  }
  content += '\n\n';
  
  // Constraints
  content += `## Constraints\n\n`;
  const behavioralData = governance?.behavioral_constraints as unknown[] | null;
  const writingData = governance?.writing_constraints as unknown[] | null;
  
  let hasConstraints = false;
  if (behavioralData && Array.isArray(behavioralData) && behavioralData.length > 0) {
    content += `### Behavioral Constraints\n\n`;
    content += formatArrayAsMarkdown(behavioralData);
    content += '\n\n';
    hasConstraints = true;
  }
  
  if (writingData && Array.isArray(writingData) && writingData.length > 0) {
    content += `### Writing Constraints\n\n`;
    content += formatArrayAsMarkdown(writingData);
    content += '\n\n';
    hasConstraints = true;
  }
  
  if (!hasConstraints) {
    content += `_No constraints defined yet._\n\n`;
  }
  
  // Negative Directory
  content += `## Negative Directory\n\n`;
  content += `These are things the brand should avoid.\n\n`;
  const negativeData = governance?.negative_directory;
  if (negativeData && typeof negativeData === 'object') {
    const negObj = negativeData as Record<string, unknown[]>;
    Object.entries(negObj).forEach(([category, items]) => {
      content += `### ${category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
      if (Array.isArray(items)) {
        items.forEach((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            const i = item as Record<string, unknown>;
            content += `- **${i.term || i.phrase || 'Item'}**: ${i.reason || i.alternative || ''}\n`;
          } else {
            content += `- ${item}\n`;
          }
        });
      }
      content += '\n';
    });
  } else {
    content += `_No negative directory defined yet._\n`;
  }
  
  return content;
}

// Generate products.md file
function generateProductsFile(products: Record<string, unknown>[] | null): string {
  let content = `# Products & Services\n\n`;
  
  if (products && Array.isArray(products) && products.length > 0) {
    products.forEach((product, index) => {
      content += `## ${product.name || `Product ${index + 1}`}\n\n`;
      if (product.type) content += `**Type:** ${product.type}\n\n`;
      if (product.description) content += `${product.description}\n\n`;
      if (product.usp) content += `**Unique Selling Proposition:** ${product.usp}\n\n`;
      if (product.cost) content += `**Price:** $${product.cost}\n\n`;
      
      const benefits = product.key_benefits as string[] | null;
      if (benefits && Array.isArray(benefits) && benefits.length > 0) {
        content += `### Key Benefits\n\n`;
        benefits.forEach(b => {
          content += `- ${b}\n`;
        });
        content += '\n';
      }
      
      if (product.competitive_differentiation) {
        content += `### Competitive Differentiation\n\n${product.competitive_differentiation}\n\n`;
      }
      
      content += `---\n\n`;
    });
  } else {
    content += `_No products or services defined yet._\n`;
  }
  
  return content;
}

// Generate audience.md file
function generateAudienceFile(audience: Record<string, unknown>[] | null): string {
  let content = `# Target Audience\n\n`;
  
  if (audience && Array.isArray(audience) && audience.length > 0) {
    audience.forEach((persona, index) => {
      content += `## ${persona.persona_name || `Persona ${index + 1}`}\n\n`;
      
      if (persona.persona_title) content += `**${persona.persona_title}**\n\n`;
      if (persona.persona_type) content += `*Type: ${persona.persona_type}*\n\n`;
      
      const demographics = persona.demographics as Record<string, unknown> | null;
      if (demographics) {
        content += `### Demographics\n\n`;
        Object.entries(demographics).forEach(([key, value]) => {
          content += `- **${key.replace(/_/g, ' ')}:** ${value}\n`;
        });
        content += '\n';
      }
      
      const goals = persona.goals_motivations as string[] | null;
      if (goals && Array.isArray(goals) && goals.length > 0) {
        content += `### Goals & Motivations\n\n`;
        goals.forEach(g => content += `- ${g}\n`);
        content += '\n';
      }
      
      const pains = persona.frustrations_pain_points as string[] | null;
      if (pains && Array.isArray(pains) && pains.length > 0) {
        content += `### Pain Points\n\n`;
        pains.forEach(p => content += `- ${p}\n`);
        content += '\n';
      }
      
      if (persona.buying_behavior) {
        content += `### Buying Behavior\n\n${persona.buying_behavior}\n\n`;
      }
      
      content += `---\n\n`;
    });
  } else {
    content += `_No audience personas defined yet._\n`;
  }
  
  return content;
}

// Generate template file from knowledge file
function generateTemplateFile(template: Record<string, unknown>): string {
  let content = `# ${template.display_name || template.reference_name || 'Template'}\n\n`;
  
  if (template.description) {
    content += `${template.description}\n\n`;
  }
  
  if (template.system_instruction_hint) {
    content += `## Usage Hint\n\n${template.system_instruction_hint}\n\n`;
  }
  
  content += `---\n*Template: ${template.reference_name}*\n`;
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { brandKitId, config } = await req.json() as { brandKitId: string; config: MarkdownExportConfig };
    
    if (!brandKitId) {
      return new Response(
        JSON.stringify({ error: 'Brand kit ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUUID(brandKitId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid brand kit ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const rateLimit = await checkRateLimit(supabaseService, user.id, 'export-markdown');
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', retryAfter }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } }
      );
    }

    // Check and deduct tokens
    const tokenResult = await checkAndDeductTokens(supabaseService, user.id, TOKEN_COST, 'export-markdown', brandKitId);
    if (!tokenResult.allowed) {
      return new Response(
        JSON.stringify({ error: tokenResult.message || 'Insufficient tokens', tokensRemaining: tokenResult.tokensRemaining }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    const isOwner = await verifyBrandKitOwnership(supabaseService, brandKitId, user.id);
    if (!isOwner) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to access this brand kit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating Markdown export for brand kit: ${brandKitId}`);

    // Fetch brand kit data
    const { data: brandKit, error: brandKitError } = await supabaseClient
      .from('brand_kits')
      .select('*')
      .eq('id', brandKitId)
      .single();

    if (brandKitError || !brandKit) {
      return new Response(
        JSON.stringify({ error: 'Brand kit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all files
    const allFiles: Record<string, string> = {};
    const exportFiles: ExportFile[] = [];
    const filesIncluded: string[] = [];

    // Always include README
    const readme = generateReadme(brandKit, config);
    allFiles['README.md'] = readme;
    exportFiles.push({ path: 'README.md', content: readme, isText: true });
    filesIncluded.push('README.md');

    // Fetch and generate section files (now consolidated - one file per section)
    if (config.selectedSections.includes('core')) {
      const { data } = await supabaseClient.from('brand_kit_core').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      const content = generateCoreFile(data);
      allFiles['core.md'] = content;
      exportFiles.push({ path: 'core.md', content, isText: true });
      filesIncluded.push('core.md');
    }

    if (config.selectedSections.includes('personality')) {
      const { data } = await supabaseClient.from('brand_kit_personality').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      const content = generatePersonalityFile(data);
      allFiles['personality.md'] = content;
      exportFiles.push({ path: 'personality.md', content, isText: true });
      filesIncluded.push('personality.md');
    }

    if (config.selectedSections.includes('expression')) {
      const { data } = await supabaseClient.from('brand_kit_expression').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      const content = generateExpressionFile(data);
      allFiles['expression.md'] = content;
      exportFiles.push({ path: 'expression.md', content, isText: true });
      filesIncluded.push('expression.md');
    }

    if (config.selectedSections.includes('governance')) {
      const { data } = await supabaseClient.from('brand_kit_governance').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      const content = generateGovernanceFile(data);
      allFiles['governance.md'] = content;
      exportFiles.push({ path: 'governance.md', content, isText: true });
      filesIncluded.push('governance.md');
    }

    if (config.selectedSections.includes('products')) {
      const { data } = await supabaseClient.from('brand_kit_products').select('*').eq('brand_kit_id', brandKitId);
      const content = generateProductsFile(data);
      allFiles['products.md'] = content;
      exportFiles.push({ path: 'products.md', content, isText: true });
      filesIncluded.push('products.md');
    }

    if (config.selectedSections.includes('audience')) {
      const { data } = await supabaseClient.from('brand_kit_target_audience').select('*').eq('brand_kit_id', brandKitId);
      const content = generateAudienceFile(data);
      allFiles['audience.md'] = content;
      exportFiles.push({ path: 'audience.md', content, isText: true });
      filesIncluded.push('audience.md');
    }

    // Add selected templates
    if (config.selectedTemplateIds && config.selectedTemplateIds.length > 0) {
      // Fetch knowledge file templates linked to this brand kit
      const { data: templates } = await supabaseClient
        .from('brand_kit_knowledge_files')
        .select('*, library_knowledge_files(*)')
        .eq('brand_kit_id', brandKitId)
        .in('library_file_id', config.selectedTemplateIds);

      if (templates && templates.length > 0) {
        for (const template of templates) {
          const libFile = template.library_knowledge_files;
          if (libFile) {
            const fileName = `templates/${(libFile.reference_name || libFile.display_name || 'template').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.md`;
            const content = generateTemplateFile(libFile);
            allFiles[fileName] = content;
            exportFiles.push({ path: fileName, content, isText: true });
            filesIncluded.push(fileName);
          }
        }
      }
    }

    // Create ZIP
    const zipBase64 = await createZipBase64(exportFiles);

    const result = {
      zipBase64,
      files: allFiles,
      metadata: {
        brandName: brandKit.name || 'Brand Kit',
        generatedAt: new Date().toISOString(),
        sectionsIncluded: config.selectedSections,
        filesIncluded,
      },
    };

    console.log(`Markdown export complete: ${filesIncluded.length} files generated`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Markdown export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
