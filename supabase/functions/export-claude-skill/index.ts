import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { validateJWT, verifyBrandKitAccess, isValidUUID } from "../_shared/auth.ts";
import { checkRateLimit, checkAndDeductTokens } from "../_shared/rate-limit.ts";

// Simple file collection for export (no external ZIP dependency)
interface ExportFile {
  path: string;
  content: string; // base64 for binary, raw for text
  isText: boolean;
}

// ========== SECURITY: TOKEN COSTS ==========
const TOKEN_COST = 2; // export-claude-skill costs 2 tokens (more expensive operation)

// ========== SECURITY: RATE LIMITING ==========
const RATE_LIMIT_MAX = 5; // 5 exports per hour
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

// Shared functions imported from ../_shared/

interface ExportConfig {
  selectedSections: string[];
  includeLogos: boolean;
  includeFonts: boolean;
  includeKnowledgeFiles: boolean;
  selectedTemplateIds: string[];
}

// Slugify text for Claude skill name (lowercase, numbers, hyphens only)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Create a ZIP file from export files and return as base64
// Uses a simple ZIP format implementation (no external dependencies)
async function createZipBase64(files: ExportFile[]): Promise<string> {
  const textEncoder = new TextEncoder();

  // ZIP file structures
  const localFileHeaders: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const fileNameBytes = textEncoder.encode(file.path);
    let contentBytes: Uint8Array;

    if (file.isText) {
      contentBytes = textEncoder.encode(file.content);
    } else {
      // Decode base64 to bytes
      const binaryString = atob(file.content);
      contentBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        contentBytes[i] = binaryString.charCodeAt(i);
      }
    }

    // Calculate CRC32
    const crc = crc32(contentBytes);

    // Local file header (30 bytes + file name + content)
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract
    localView.setUint16(6, 0, true); // General purpose bit flag
    localView.setUint16(8, 0, true); // Compression method (0 = stored)
    localView.setUint16(10, 0, true); // File last modification time
    localView.setUint16(12, 0, true); // File last modification date
    localView.setUint32(14, crc, true); // CRC-32
    localView.setUint32(18, contentBytes.length, true); // Compressed size
    localView.setUint32(22, contentBytes.length, true); // Uncompressed size
    localView.setUint16(26, fileNameBytes.length, true); // File name length
    localView.setUint16(28, 0, true); // Extra field length

    localHeader.set(fileNameBytes, 30);

    // Central directory header (46 bytes + file name)
    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true); // Central directory header signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed to extract
    centralView.setUint16(8, 0, true); // General purpose bit flag
    centralView.setUint16(10, 0, true); // Compression method
    centralView.setUint16(12, 0, true); // File last modification time
    centralView.setUint16(14, 0, true); // File last modification date
    centralView.setUint32(16, crc, true); // CRC-32
    centralView.setUint32(20, contentBytes.length, true); // Compressed size
    centralView.setUint32(24, contentBytes.length, true); // Uncompressed size
    centralView.setUint16(28, fileNameBytes.length, true); // File name length
    centralView.setUint16(30, 0, true); // Extra field length
    centralView.setUint16(32, 0, true); // File comment length
    centralView.setUint16(34, 0, true); // Disk number start
    centralView.setUint16(36, 0, true); // Internal file attributes
    centralView.setUint32(38, 0, true); // External file attributes
    centralView.setUint32(42, offset, true); // Relative offset of local header

    centralHeader.set(fileNameBytes, 46);

    localFileHeaders.push(localHeader, contentBytes);
    centralDirectoryHeaders.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  }

  // Calculate central directory size
  const centralDirectorySize = centralDirectoryHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of central directory record (22 bytes)
  const endOfCentralDirectory = new Uint8Array(22);
  const endView = new DataView(endOfCentralDirectory.buffer);

  endView.setUint32(0, 0x06054b50, true); // End of central directory signature
  endView.setUint16(4, 0, true); // Number of this disk
  endView.setUint16(6, 0, true); // Disk where central directory starts
  endView.setUint16(8, files.length, true); // Number of central directory records on this disk
  endView.setUint16(10, files.length, true); // Total number of central directory records
  endView.setUint32(12, centralDirectorySize, true); // Size of central directory
  endView.setUint32(16, offset, true); // Offset of start of central directory
  endView.setUint16(20, 0, true); // Comment length

  // Combine all parts
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

  // Convert to base64 using chunks to avoid stack overflow
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < zipData.length; i += chunkSize) {
    const chunk = zipData.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// CRC32 implementation for ZIP
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;

  // CRC32 lookup table
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

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(origin);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const { user, valid, error: authError } = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);
    if (!valid || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { brandKitId, config } = await req.json() as { brandKitId: string; config: ExportConfig };

    if (!brandKitId) {
      return new Response(
        JSON.stringify({ error: 'Brand kit ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    if (!isValidUUID(brandKitId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid brand kit ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for security checks
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const rateLimit = await checkRateLimit(supabaseService, user.id, 'export-claude-skill', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          }
        }
      );
    }

    // Check and deduct tokens
    const tokenResult = await checkAndDeductTokens(supabaseService, user.id, TOKEN_COST, 'export-claude-skill', brandKitId);
    if (!tokenResult.allowed) {
      return new Response(
        JSON.stringify({
          error: tokenResult.message || 'Insufficient tokens',
          tokensRemaining: tokenResult.tokensRemaining,
        }),
        {
          status: 402,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Tokens-Remaining': String(tokenResult.tokensRemaining),
          }
        }
      );
    }

    // Verify brand kit ownership
    const { isMember } = await verifyBrandKitAccess(supabaseService, brandKitId, user.id);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to access this brand kit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating Claude Skill for brand kit: ${brandKitId}, tokens remaining: ${tokenResult.tokensRemaining}`);

    const supabaseAnonHeader = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } }
    });

    // Fetch brand kit data
    const { data: brandKit, error: brandKitError } = await supabaseAnonHeader
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

    // Fetch related data based on selected sections
    const sectionData: Record<string, any> = { basics: brandKit };

    if (config.selectedSections.includes('core')) {
      const { data } = await supabaseAnonHeader.from('brand_kit_core').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      sectionData.core = data;
    }

    if (config.selectedSections.includes('personality')) {
      const { data } = await supabaseAnonHeader.from('brand_kit_personality').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      sectionData.personality = data;
    }

    if (config.selectedSections.includes('expression')) {
      const { data } = await supabaseAnonHeader.from('brand_kit_expression').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      sectionData.expression = data;
    }

    if (config.selectedSections.includes('governance')) {
      const { data } = await supabaseAnonHeader.from('brand_kit_governance').select('*').eq('brand_kit_id', brandKitId).maybeSingle();
      sectionData.governance = data;
    }

    if (config.selectedSections.includes('products')) {
      const { data } = await supabaseAnonHeader.from('brand_kit_products').select('*').eq('brand_kit_id', brandKitId);
      sectionData.products = data || [];
    }

    if (config.selectedSections.includes('audience')) {
      const { data } = await supabaseAnonHeader.from('brand_kit_target_audience').select('*').eq('brand_kit_id', brandKitId);
      sectionData.audience = data || [];
    }

    // Generate AI description using Lovable AI
    const description = await generateAIDescription(brandKit, sectionData);

    // Create the SKILL.md content
    const skillMd = generateSkillMd(brandKit.name, description, sectionData, config);

    // Collect files for export (simplified - no ZIP dependency)
    const exportFiles: ExportFile[] = [];
    const filesIncluded: string[] = ['SKILL.md'];

    // Add SKILL.md
    exportFiles.push({ path: 'SKILL.md', content: skillMd, isText: true });

    // Create image-library.json catalog for logos and visual assets
    if (config.includeLogos) {
      const imageLibrary: {
        images: Array<{
          id: string;
          url: string;
          title: string;
          description: string;
          use_cases: string[];
          background?: string;
          dimensions?: string;
          asset_type?: string;
          tags?: string[];
          ai_analysis?: Record<string, unknown>;
        }>
      } = { images: [] };

      // Add core brand logos
      if (brandKit.logo_url) {
        imageLibrary.images.push({
          id: 'primary-logo',
          url: brandKit.logo_url,
          title: 'Primary Logo',
          description: `Main ${brandKit.name} logo for light backgrounds`,
          use_cases: ['documents', 'presentations', 'headers', 'marketing materials'],
          background: 'light',
          asset_type: 'logo'
        });
      }
      if (brandKit.logo_dark_url) {
        imageLibrary.images.push({
          id: 'dark-logo',
          url: brandKit.logo_dark_url,
          title: 'Dark Mode Logo',
          description: `${brandKit.name} logo optimized for dark backgrounds`,
          use_cases: ['dark mode UI', 'dark presentations', 'dark themed materials'],
          background: 'dark',
          asset_type: 'logo'
        });
      }
      if (brandKit.favicon_url) {
        imageLibrary.images.push({
          id: 'favicon',
          url: brandKit.favicon_url,
          title: 'Favicon',
          description: 'Small icon for browser tabs and bookmarks',
          use_cases: ['browser tabs', 'bookmarks', 'app icons'],
          dimensions: '32x32',
          asset_type: 'icon'
        });
      }
      if (brandKit.og_image_url) {
        imageLibrary.images.push({
          id: 'og-image',
          url: brandKit.og_image_url,
          title: 'Social Share Image',
          description: 'Image for social media link previews (Open Graph)',
          use_cases: ['social sharing', 'link previews', 'meta tags'],
          dimensions: '1200x630',
          asset_type: 'social'
        });
      }

      // Phase 3: Fetch and add visual assets from user_visual_assets table
      try {
        const { data: visualAssets } = await supabaseAnonHeader
          .from('user_visual_assets')
          .select('*')
          .eq('brand_kit_id', brandKitId)
          .eq('is_private', false);

        if (visualAssets && visualAssets.length > 0) {
          visualAssets.forEach((asset: any) => {
            // Map asset_type to use_cases
            const assetTypeUseCases: Record<string, string[]> = {
              'logo': ['documents', 'presentations', 'headers', 'marketing materials'],
              'icon': ['UI elements', 'app icons', 'buttons', 'navigation'],
              'product': ['product pages', 'catalogs', 'e-commerce', 'marketing'],
              'hero': ['landing pages', 'headers', 'hero sections', 'banners'],
              'background': ['page backgrounds', 'textures', 'patterns', 'overlays'],
              'social': ['social media posts', 'profile images', 'cover photos'],
              'pattern': ['backgrounds', 'textures', 'decorative elements'],
              'illustration': ['infographics', 'diagrams', 'decorative content'],
              'photo': ['marketing materials', 'blog posts', 'social media'],
              'other': ['various brand materials']
            };

            const useCases = assetTypeUseCases[asset.asset_type] || assetTypeUseCases['other'];

            imageLibrary.images.push({
              id: `visual-asset-${asset.id.substring(0, 8)}`,
              url: asset.public_url || '',
              title: asset.title || asset.file_name,
              description: asset.description || `${asset.asset_type} asset for ${brandKit.name}`,
              use_cases: useCases,
              asset_type: asset.asset_type,
              tags: asset.tags || [],
              ai_analysis: asset.ai_analysis || undefined
            });
          });
        }
      } catch (e) {
        console.log('Could not fetch visual assets:', e);
      }

      // Add image-library.json to assets folder
      if (imageLibrary.images.length > 0) {
        exportFiles.push({
          path: 'assets/image-library.json',
          content: JSON.stringify(imageLibrary, null, 2),
          isText: true
        });
        filesIncluded.push('assets/image-library.json');

        // Only include primary logo as fallback for offline use
        if (brandKit.logo_url) {
          try {
            const response = await fetch(brandKit.logo_url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, i + chunkSize);
                binary += String.fromCharCode(...chunk);
              }
              const base64 = btoa(binary);
              exportFiles.push({ path: 'assets/fallback/logo.png', content: base64, isText: false });
              filesIncluded.push('assets/fallback/logo.png');
            }
          } catch (e) {
            console.log('Could not fetch primary logo for fallback:', e);
          }
        }
      }
    }

    // Add fonts reference to references folder
    if (config.includeFonts) {
      const fontsContent = generateFontsReference(brandKit);
      exportFiles.push({ path: 'references/typography.md', content: fontsContent, isText: true });
      filesIncluded.push('references/typography.md');
    }

    // Add knowledge files to references folder
    if (config.includeKnowledgeFiles) {
      const { data: knowledgeFiles } = await supabaseAnonHeader
        .from('brand_kit_knowledge_files')
        .select('*, library_knowledge_files(*)')
        .eq('brand_kit_id', brandKitId)
        .eq('is_included_in_export', true);

      if (knowledgeFiles && knowledgeFiles.length > 0) {
        for (const kf of knowledgeFiles) {
          const libFile = kf.library_knowledge_files;
          if (libFile?.storage_path) {
            try {
              const { data: fileData } = await supabaseAnonHeader.storage
                .from('knowledge_files')
                .download(libFile.storage_path);

              if (fileData) {
                // Convert to .md for references folder
                const baseName = kf.custom_reference_name || libFile.display_name;
                const fileName = `${baseName}.md`;
                const text = await fileData.text();
                exportFiles.push({ path: `references/${fileName}`, content: text, isText: true });
                filesIncluded.push(`references/${fileName}`);
              }
            } catch (e) {
              console.log(`Could not fetch knowledge file: ${libFile.display_name}`, e);
            }
          }
        }
      }
    }

    // Add selected curated templates to references folder
    if (config.selectedTemplateIds && config.selectedTemplateIds.length > 0) {
      for (const templateId of config.selectedTemplateIds) {
        const templateContent = getTemplateContent(templateId);
        if (templateContent) {
          exportFiles.push({ path: `references/${templateContent.filename}`, content: templateContent.content, isText: true });
          filesIncluded.push(`references/${templateContent.filename}`);
        }
      }
    }

    // Phase 6: Generate Platform Style Guide if we have expression data
    if (config.selectedSections.includes('expression') && sectionData.expression) {
      const platformStyleGuide = generatePlatformStyleGuide(brandKit.name, sectionData.expression);
      if (platformStyleGuide) {
        exportFiles.push({ path: 'references/platform-style-guide.md', content: platformStyleGuide, isText: true });
        filesIncluded.push('references/platform-style-guide.md');
      }

      // Generate platform voice modifiers JSON
      const voiceModifiers = generateVoiceModifiersJson(sectionData.expression);
      if (voiceModifiers) {
        exportFiles.push({ path: 'references/platform-voice-modifiers.json', content: voiceModifiers, isText: true });
        filesIncluded.push('references/platform-voice-modifiers.json');
      }
    }

    // Phase 5: Generate Python brand application script
    const brandScript = generateBrandApplicationScript(brandKit, sectionData);
    exportFiles.push({ path: 'scripts/apply_brand.py', content: brandScript, isText: true });
    filesIncluded.push('scripts/apply_brand.py');

    const validateScript = generateBrandValidationScript(brandKit, sectionData);
    exportFiles.push({ path: 'scripts/validate_brand.py', content: validateScript, isText: true });
    filesIncluded.push('scripts/validate_brand.py');

    // Create ZIP file as base64
    // Build a simple ZIP structure manually since we can't use external dependencies reliably

    // FILTER: Ensure we don't have duplicate skill.md (lowercase) - Enforce SKILL.md
    const uniqueExportFiles = exportFiles.filter(f => f.path !== 'skill.md');

    const zipBase64 = await createZipBase64(uniqueExportFiles);

    const result = {
      skillMd,
      zipBase64,
      files: exportFiles,
      description,
      metadata: {
        brandName: brandKit.name,
        generatedAt: new Date().toISOString(),
        sectionsIncluded: config.selectedSections,
        filesIncluded,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in export-claude-skill:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateAIDescription(brandKit: any, sectionData: Record<string, any>): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    // Fallback to template if no API key
    return `Apply ${brandKit.name} brand guidelines to presentations and documents`;
  }

  try {
    const brandContext = `
Brand Name: ${brandKit.name}
Tagline: ${brandKit.tagline || 'N/A'}
Description: ${brandKit.description || 'N/A'}
Industry: ${sectionData.core?.industry_classification_id ? 'Available' : 'N/A'}
Mission: ${sectionData.core?.mission || 'N/A'}
`.trim();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You generate concise skill descriptions for Claude AI YAML frontmatter. 
The description should clearly explain:
1. WHAT the skill does (specific capability)
2. WHEN to use it (use cases)

Format: "[Action verb] [Brand]'s [specific capability] for [use cases]"
Be specific about what the AI can help with based on the brand info.
Max 200 characters. Do NOT use generic phrases like "presentations and documents" - be specific to the brand.

Examples:
- "Create on-brand marketing copy and social posts using Nike's athlete-focused voice"
- "Generate Airbnb-style property descriptions with hospitality-focused messaging"
- "Write technical documentation matching Stripe's developer-friendly tone"`
          },
          {
            role: 'user',
            content: `Generate a skill description for this brand:\n\n${brandContext}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return `Apply ${brandKit.name} brand guidelines to presentations and documents`;
    }

    const data = await response.json();
    let description = data.choices?.[0]?.message?.content?.trim() || '';

    // Ensure under 200 chars
    if (description.length > 200) {
      description = description.substring(0, 197) + '...';
    }

    return description || `Apply ${brandKit.name} brand guidelines to presentations and documents`;
  } catch (e) {
    console.error('AI description generation failed:', e);
    return `Apply ${brandKit.name} brand guidelines to presentations and documents`;
  }
}

// Helper: Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

// Helper: Format color with hex and RGB
function formatColorWithRgb(name: string, hex: string, usage?: string): string {
  const rgb = hexToRgb(hex);
  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
  const usageStr = usage ? ` | ${usage}` : '';
  return `| ${name} | \`${hex}\` | ${rgbStr}${usageStr} |`;
}

// Helper: Get color usage context
function getColorUsage(colorType: string): string {
  const usageMap: Record<string, string> = {
    primary: 'CTAs, buttons, links, headers',
    secondary: 'Accents, hover states, secondary elements',
    accent: 'Highlights, badges, special emphasis',
    background: 'Page backgrounds, card surfaces',
    text_primary: 'Body text, headings',
    text_secondary: 'Captions, muted text, labels',
    link: 'Hyperlinks, interactive text',
    custom: 'Brand-specific use cases',
  };
  return usageMap[colorType] || 'General use';
}

function generateSkillMd(brandName: string, description: string, sectionData: Record<string, any>, config: ExportConfig): string {
  const basics = sectionData.basics;
  const core = sectionData.core;
  const personality = sectionData.personality;
  const expression = sectionData.expression;
  const governance = sectionData.governance;
  const products = sectionData.products || [];
  const audience = sectionData.audience || [];

  const slugifiedName = slugify(`${brandName}-brand-guidelines`);

  // Helper function for chunk-based base64 encoding (prevents stack overflow on large files)
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  let content = `---
name: ${slugifiedName}
description: ${description}
---

## Overview

This Skill provides ${brandName}'s official brand guidelines for creating consistent, professional materials. Apply these standards to ensure all outputs match the brand's visual identity and voice.

`;

  // ========== QUICK REFERENCE CARD (Phase 2) ==========
  content += `## Quick Reference Card

### ✅ Must-Have Elements
- Company logo on first page/slide
- Correct brand colors (Primary: \`${basics.primary_color || '#000000'}\`)
- Approved fonts only${basics.heading_font ? ` (${basics.heading_font}${basics.body_font ? `, ${basics.body_font}` : ''})` : ''}
- Consistent formatting throughout
- Professional tone of voice

### ❌ Never Use
`;

  // Pull from governance negative_directory if available
  const negativeItems: string[] = [];
  if (governance?.negative_directory && Array.isArray(governance.negative_directory)) {
    negativeItems.push(...governance.negative_directory.slice(0, 5));
  }
  // Add standard items if we don't have enough
  const standardNeverUse = [
    'Competitor logos or references',
    'Unapproved colors or gradients',
    'Decorative or script fonts',
    'Pixelated or stretched logos',
    'Informal language or slang',
  ];
  while (negativeItems.length < 5 && standardNeverUse.length > 0) {
    const item = standardNeverUse.shift();
    if (item && !negativeItems.some(n => n.toLowerCase().includes(item.toLowerCase()))) {
      negativeItems.push(item);
    }
  }
  negativeItems.slice(0, 5).forEach(item => {
    content += `- ${item}\n`;
  });
  content += '\n';

  // Brand Basics
  if (config.selectedSections.includes('basics')) {
    content += `## Brand Basics

**Brand Name:** ${brandName}
`;
    if (basics.tagline) content += `**Tagline:** ${basics.tagline}\n`;
    if (basics.description) content += `**Description:** ${basics.description}\n`;
    if (basics.website_url) content += `**Website:** ${basics.website_url}\n`;
    content += '\n';
  }

  // Colors - Enhanced with RGB and usage context (Phase 1)
  if (config.selectedSections.includes('basics')) {
    // Read from color_details (new unified column), fall back to flat columns
    const cd = basics.color_details || {};
    const hasColorDetails = Object.keys(cd).some((k: string) => cd[k]?.light?.hex);

    const colorEntries: Array<{ name: string; hex: string; usage: string }> = [];

    if (hasColorDetails) {
      const roleLabels: Record<string, string> = {
        primary: 'Primary', secondary: 'Secondary', accent: 'Accent',
        background: 'Background', text_primary: 'Text Primary',
        text_secondary: 'Text Secondary', link: 'Links',
      };
      for (const [role, data] of Object.entries(cd) as [string, any][]) {
        if (data?.light?.hex) {
          colorEntries.push({
            name: data.name || roleLabels[role] || role,
            hex: data.light.hex,
            usage: data.light.useWhen || data.light.description || getColorUsage(role),
          });
        }
      }
    } else {
      if (basics.primary_color) {
        colorEntries.push({ name: 'Primary', hex: basics.primary_color, usage: getColorUsage('primary') });
      }
      if (basics.secondary_color) {
        colorEntries.push({ name: 'Secondary', hex: basics.secondary_color, usage: getColorUsage('secondary') });
      }
      if (basics.accent_color) {
        colorEntries.push({ name: 'Accent', hex: basics.accent_color, usage: getColorUsage('accent') });
      }
      if (basics.background_color) {
        colorEntries.push({ name: 'Background', hex: basics.background_color, usage: getColorUsage('background') });
      }
      if (basics.text_primary_color) {
        colorEntries.push({ name: 'Text Primary', hex: basics.text_primary_color, usage: getColorUsage('text_primary') });
      }
      if (basics.text_secondary_color) {
        colorEntries.push({ name: 'Text Secondary', hex: basics.text_secondary_color, usage: getColorUsage('text_secondary') });
      }
      if (basics.link_color) {
        colorEntries.push({ name: 'Links', hex: basics.link_color, usage: getColorUsage('link') });
      }
      for (let i = 1; i <= 4; i++) {
        const colorKey = `custom_${i}_color` as keyof typeof basics;
        const nameKey = `custom_${i}_name` as keyof typeof basics;
        if (basics[colorKey]) {
          colorEntries.push({ name: basics[nameKey] || `Custom ${i}`, hex: basics[colorKey], usage: getColorUsage('custom') });
        }
      }
    }

    if (colorEntries.length > 0) {
      content += `## Color Reference Card

### Digital Colors (Hex/RGB)

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
`;

    colorEntries.forEach(({ name, hex, usage }) => {
      content += formatColorWithRgb(name, hex, usage) + '\n';
    });

    content += `
### Accessibility Standards

- **Body text on light backgrounds:** Use dark colors with minimum 4.5:1 contrast ratio
- **Large text (18pt+):** Minimum 3:1 contrast ratio
- **Interactive elements:** Ensure sufficient color contrast for all states (default, hover, focus)
- **Never rely on color alone** to convey information—use icons or text labels as backup

`;
    }
  }

  // Typography
  if (config.selectedSections.includes('basics') && (basics.heading_font || basics.body_font)) {
    content += `## Typography

`;
    if (basics.heading_font) content += `- **Headings:** ${basics.heading_font}\n`;
    if (basics.body_font) content += `- **Body:** ${basics.body_font}\n`;
    if (basics.paragraph_font) content += `- **Paragraph:** ${basics.paragraph_font}\n`;
    content += '\n';
  }

  // Core Identity
  if (config.selectedSections.includes('core') && core) {
    content += `## Core Identity

`;
    if (core.mission) content += `### Mission\n${core.mission}\n\n`;
    if (core.vision) content += `### Vision\n${core.vision}\n\n`;
    if (core.brand_story) content += `### Brand Story\n${core.brand_story}\n\n`;
    if (core.brand_promises && Array.isArray(core.brand_promises) && core.brand_promises.length > 0) {
      content += `### Brand Promises\n`;
      core.brand_promises.forEach((promise: any) => {
        const promiseTitle = typeof promise === 'string' ? promise : promise.title;
        const promiseDesc = typeof promise === 'object' && promise.description ? promise.description : '';
        content += `- **${promiseTitle}**${promiseDesc ? `: ${promiseDesc}` : ''}\n`;
      });
      content += '\n';
    }
  }

  // Personality
  if (config.selectedSections.includes('personality') && personality) {
    content += `## Brand Personality

`;
    if (personality.personality_traits && Array.isArray(personality.personality_traits) && personality.personality_traits.length > 0) {
      content += `### Personality Traits\n`;
      personality.personality_traits.forEach((trait: any) => {
        const traitName = typeof trait === 'string' ? trait : trait.title || trait.name;
        const traitDesc = typeof trait === 'object' ? trait.description : '';
        content += `- **${traitName}**${traitDesc ? `: ${traitDesc}` : ''}\n`;
      });
      content += '\n';
    }
    if (personality.brand_values && Array.isArray(personality.brand_values) && personality.brand_values.length > 0) {
      content += `### Brand Values\n`;
      personality.brand_values.forEach((value: any) => {
        const valueName = typeof value === 'string' ? value : value.name;
        const valueDesc = typeof value === 'object' ? value.description : '';
        content += `- **${valueName}**${valueDesc ? `: ${valueDesc}` : ''}\n`;
      });
      content += '\n';
    }
  }

  // Expression / Voice & Tone - Phase 6 Enhanced
  if (config.selectedSections.includes('expression') && expression) {
    content += `## Voice & Tone

`;

    // Phase 6: Voice Archetypes
    if (expression.voice_archetypes && typeof expression.voice_archetypes === 'object') {
      const va = expression.voice_archetypes as {
        primary?: { name: string; description?: string; characteristics?: string[] };
        secondary?: { name: string; description?: string; characteristics?: string[] };
        antiArchetypes?: Array<{ name: string; description?: string; characteristics?: string[] }>;
      };

      content += `### Voice Archetypes

`;
      if (va.primary?.name) {
        content += `**Primary Archetype: ${va.primary.name}**
`;
        if (va.primary.description) content += `${va.primary.description}
`;
        if (va.primary.characteristics && va.primary.characteristics.length > 0) {
          content += `- Characteristics: ${va.primary.characteristics.join(', ')}
`;
        }
        content += `
`;
      }

      if (va.secondary?.name) {
        content += `**Secondary Archetype: ${va.secondary.name}**
`;
        if (va.secondary.description) content += `${va.secondary.description}
`;
        if (va.secondary.characteristics && va.secondary.characteristics.length > 0) {
          content += `- Characteristics: ${va.secondary.characteristics.join(', ')}
`;
        }
        content += `
`;
      }

      if (va.antiArchetypes && va.antiArchetypes.length > 0) {
        content += `**Anti-Archetypes (Never Be):**
`;
        va.antiArchetypes.forEach((anti: any) => {
          content += `- **${anti.name}**: ${anti.description || ''}
`;
        });
        content += `
`;
      }
    }

    // Phase 6: Tone Dimensions (visual sliders)
    if (expression.tone_dimensions && typeof expression.tone_dimensions === 'object') {
      const td = expression.tone_dimensions as Record<string, number>;
      content += `### Tone Dimensions

| Dimension | Value | Interpretation |
|-----------|-------|----------------|
`;
      const dimensionLabels: Record<string, { low: string; high: string }> = {
        energy: { low: 'Calm & Measured', high: 'Dynamic & Energetic' },
        formality: { low: 'Casual & Relaxed', high: 'Professional & Formal' },
        warmth: { low: 'Neutral & Objective', high: 'Warm & Personal' },
        confidence: { low: 'Humble & Tentative', high: 'Bold & Assertive' },
        complexity: { low: 'Simple & Direct', high: 'Nuanced & Detailed' },
      };

      Object.entries(td).forEach(([key, value]) => {
        const labels = dimensionLabels[key] || { low: 'Low', high: 'High' };
        const interpretation = value < 33 ? labels.low : value > 66 ? labels.high : 'Balanced';
        content += `| ${key.charAt(0).toUpperCase() + key.slice(1)} | ${value}% | ${interpretation} |
`;
      });
      content += `
`;
    }

    if (expression.tone_of_voice && typeof expression.tone_of_voice === 'object') {
      const tov = expression.tone_of_voice as { description?: string; attributes?: Array<{ attribute: string; min_label: string; max_label: string; value: number }> };
      content += `### Tone of Voice
`;

      // Handle description
      if (tov.description) {
        content += `${tov.description}

`;
      }

      // Handle attributes array
      if (tov.attributes && Array.isArray(tov.attributes) && tov.attributes.length > 0) {
        content += `**Tone Attributes:**
`;
        tov.attributes.forEach((attr) => {
          const position = attr.value < 33 ? attr.min_label : attr.value > 66 ? attr.max_label : 'Balanced';
          content += `- **${attr.attribute}:** ${position} (${attr.value}/100)
`;
        });
        content += `
`;
      }
    }

    // Phase 6: Content Categories
    if (expression.content_categories && Array.isArray(expression.content_categories) && expression.content_categories.length > 0) {
      content += `### Content Category Templates

Use these templates when generating content for specific purposes:

`;
      expression.content_categories.forEach((cat: any) => {
        content += `#### ${cat.name}
`;
        if (cat.description) content += `${cat.description}
`;
        if (cat.typicalStructure) content += `- **Structure:** ${cat.typicalStructure}
`;
        if (cat.toneShift) content += `- **Tone Adjustment:** ${cat.toneShift}
`;
        if (cat.lengthGuidance) content += `- **Length:** ${cat.lengthGuidance}
`;
        if (cat.keyPhrases && cat.keyPhrases.length > 0) {
          content += `- **Key Phrases:** ${cat.keyPhrases.join(', ')}
`;
        }
        content += `
`;
      });
    }

    if (expression.verbal_style && typeof expression.verbal_style === 'object') {
      const vs = expression.verbal_style as { sentence_structure?: string; vocabulary_level?: string; punctuation_style?: string };
      const hasContent = vs.sentence_structure || vs.vocabulary_level || vs.punctuation_style;
      if (hasContent) {
        content += `### Verbal Style
`;
        if (vs.sentence_structure) content += `- **Sentence Structure:** ${vs.sentence_structure}
`;
        if (vs.vocabulary_level) content += `- **Vocabulary Level:** ${vs.vocabulary_level}
`;
        if (vs.punctuation_style) content += `- **Punctuation Style:** ${vs.punctuation_style}
`;
        content += `
`;
      }
    }

    if (expression.preferred_terminology && Array.isArray(expression.preferred_terminology) && expression.preferred_terminology.length > 0) {
      content += `### Preferred Terminology
`;
      expression.preferred_terminology.forEach((termItem: any) => {
        const termValue = typeof termItem === 'string' ? termItem : termItem.term;
        const avoidList = typeof termItem === 'object' && Array.isArray(termItem.instead_of) ? termItem.instead_of.filter((a: string) => a && a.trim()) : [];
        const description = typeof termItem === 'object' ? termItem.description : '';

        if (avoidList.length > 0) {
          const quotedTerms = avoidList.map((a: string) => '"' + a.trim() + '"').join(', ');
          content += `- Use **"${termValue}"** instead of: ${quotedTerms}
`;
        } else if (description) {
          content += `- **${termValue}:** ${description}
`;
        } else {
          content += `- ${termValue}
`;
        }
      });
      content += `
`;
    }
  }

  // Governance - Phase 6 Enhanced with Writing Constraints and Drift Prevention
  if (config.selectedSections.includes('governance') && governance) {
    content += `## Guidelines & Governance

`;

    // Phase 6: Writing Constraints
    if (governance.writing_constraints && typeof governance.writing_constraints === 'object') {
      const wc = governance.writing_constraints as { constraints?: Array<{ type: string; rule: string; value?: string; platform?: string; isHard: boolean }>; platformSpecificEnabled?: boolean };
      if (wc.constraints && wc.constraints.length > 0) {
        content += `### Writing Constraints

`;
        const hardConstraints = wc.constraints.filter((c: any) => c.isHard);
        const softConstraints = wc.constraints.filter((c: any) => !c.isHard);

        if (hardConstraints.length > 0) {
          content += `**Hard Constraints (Must Enforce):**
`;
          hardConstraints.forEach((c: any) => {
            const platformNote = c.platform ? ` [${c.platform}]` : '';
            const valueNote = c.value ? ` (${c.value})` : '';
            content += `- ${c.rule}${valueNote}${platformNote}
`;
          });
          content += `
`;
        }

        if (softConstraints.length > 0) {
          content += `**Soft Guidelines:**
`;
          softConstraints.forEach((c: any) => {
            const platformNote = c.platform ? ` [${c.platform}]` : '';
            const valueNote = c.value ? ` (${c.value})` : '';
            content += `- ${c.rule}${valueNote}${platformNote}
`;
          });
          content += `
`;
        }
      }
    }

    // Phase 6: Drift Prevention Prompts
    if (governance.drift_prevention_prompts && Array.isArray(governance.drift_prevention_prompts) && governance.drift_prevention_prompts.length > 0) {
      content += `### Drift Prevention

**Never produce text that:**
`;
      governance.drift_prevention_prompts.forEach((prompt: any) => {
        const promptText = typeof prompt === 'string' ? prompt : prompt.prompt;
        const cleanedPrompt = promptText.toLowerCase().replace(/^never produce text that\s*/i, '');
        content += `- ${cleanedPrompt}
`;
      });
      content += `
`;
    }

    if (governance.usage_guidelines && Array.isArray(governance.usage_guidelines) && governance.usage_guidelines.length > 0) {
      content += `### Usage Guidelines
`;
      governance.usage_guidelines.forEach((guideline: string) => {
        content += `- ${guideline}
`;
      });
      content += `
`;
    }
    if (governance.behavioral_constraints && Array.isArray(governance.behavioral_constraints) && governance.behavioral_constraints.length > 0) {
      content += `### Behavioral Constraints
`;
      governance.behavioral_constraints.forEach((constraint: string) => {
        content += `- ${constraint}
`;
      });
      content += `
`;
    }
    if (governance.negative_directory && Array.isArray(governance.negative_directory) && governance.negative_directory.length > 0) {
      content += `### Things to Avoid
`;
      governance.negative_directory.forEach((item: any) => {
        // Handle both old string format and new object format
        const term = typeof item === 'string' ? item : item.term;
        const reason = typeof item === 'object' && item.reason ? ` — ${item.reason}` : '';
        const category = typeof item === 'object' && item.category ? ` [${item.category}]` : '';
        content += `- "${term}"${reason}${category}
`;
      });
      content += `
`;
    }
  }

  // Products
  if (config.selectedSections.includes('products') && products.length > 0) {
    content += `## Products & Services

`;
    products.forEach((product: any) => {
      content += `### ${product.name}\n`;
      if (product.description) content += `${product.description}\n\n`;
      if (product.usp) content += `**USP:** ${product.usp}\n`;
      if (product.key_benefits && Array.isArray(product.key_benefits) && product.key_benefits.length > 0) {
        content += `**Key Benefits:**\n`;
        product.key_benefits.forEach((benefit: string) => {
          content += `- ${benefit}\n`;
        });
      }
      content += '\n';
    });
  }

  // Target Audience
  if (config.selectedSections.includes('audience') && audience.length > 0) {
    content += `## Target Audience

`;
    audience.forEach((persona: any) => {
      if (persona.persona_name) content += `### ${persona.persona_name}\n`;
      if (persona.persona_title) content += `**Title:** ${persona.persona_title}\n`;
      if (persona.demographics && Object.keys(persona.demographics).length > 0) {
        content += `**Demographics:** `;
        const demoItems = Object.entries(persona.demographics)
          .filter(([_, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        content += demoItems.join(', ') + '\n';
      }
      if (persona.goals_motivations && Array.isArray(persona.goals_motivations) && persona.goals_motivations.length > 0) {
        content += `**Goals:** ${persona.goals_motivations.join(', ')}\n`;
      }
      content += '\n';
    });
  }

  // Phase 4: Document Templates Section
  content += `## Document Templates

### Email Signature
\`\`\`
[Name]
[Title]
${brandName}${basics.tagline ? ` | ${basics.tagline}` : ''}
[Phone] | [Email]
${basics.website_url || '[Website URL]'}
\`\`\`

### Slide Footer
\`\`\`
© ${new Date().getFullYear()} ${brandName} | Confidential | Page [X]
\`\`\`

### Report Header
\`\`\`
[Logo]     [Document Title]     Page [X] of [Y]
\`\`\`

### File Naming Convention
\`\`\`
YYYY-MM-DD_DocumentType_Version_Status.ext
\`\`\`

**Examples:**
- \`${new Date().toISOString().split('T')[0]}_QuarterlyReport_v2_FINAL.pptx\`
- \`${new Date().toISOString().split('T')[0]}_BudgetAnalysis_v1_DRAFT.xlsx\`
- \`${new Date().toISOString().split('T')[0]}_Proposal_v3_APPROVED.pdf\`

`;

  // When to Apply
  content += `## When to Apply

Apply these brand guidelines when:
- Creating presentations or documents
- Writing marketing materials
- Developing external communications
- Building visual assets
- Crafting social media content
- Designing user interfaces

`;

  // Resources section
  const hasResources = config.includeLogos || config.includeFonts || config.includeKnowledgeFiles || (config.selectedTemplateIds && config.selectedTemplateIds.length > 0);
  if (hasResources) {
    content += `## Resources

This skill includes the following folder structure:

### Image Selection
When selecting images, consult \`assets/image-library.json\` which contains metadata for all brand images including:
- \`asset_type\`: logo, icon, product, hero, background, social, pattern, illustration, photo
- \`use_cases\`: suggested contexts for each image
- \`tags\`: searchable keywords
- \`ai_analysis\`: AI-generated insights about the image (when available)

Match images based on:
1. \`use_cases\` alignment with the request
2. \`background\` requirement (light/dark)
3. \`asset_type\` for the content being created
4. Context of the output being created

Use the \`url\` field directly in outputs. For offline-critical assets, a local copy of the primary logo exists in \`assets/fallback/\`.

`;
    if (config.includeFonts) content += `### Typography\n- Font specifications: \`references/typography.md\`\n\n`;
    if (config.includeKnowledgeFiles || (config.selectedTemplateIds && config.selectedTemplateIds.length > 0)) {
      content += `### Reference Documents\nAdditional documentation is available in the \`references/\` folder:\n`;
      if (config.includeKnowledgeFiles) content += `- Knowledge files for domain-specific guidance\n`;
      if (config.selectedTemplateIds && config.selectedTemplateIds.length > 0) {
        content += `- Governance templates for compliance and best practices\n`;
      }
      content += '\n';
    }
    content += `### Scripts
The \`scripts/\` folder contains executable Python code for brand automation:
- \`apply_brand.py\`: Apply brand formatting to documents (colors, fonts, styling)
- \`validate_brand.py\`: Check documents for brand compliance issues

These scripts can be run by Claude to automate branding tasks.
`;
  }

  // Phase 7: Enhanced Metadata Section
  const imageCount = config.includeLogos ? 'Available' : '0';
  const templateCount = config.selectedTemplateIds?.length || 0;

  content += `
---

## Metadata

- **Brand Kit Version:** 1.0
- **Generated:** ${new Date().toISOString().split('T')[0]}
- **Sections Included:** ${config.selectedSections.join(', ')}
- **Resources:** Images: ${imageCount}, Templates: ${templateCount}, Typography: ${config.includeFonts ? 'Yes' : 'No'}

For questions about these brand guidelines, refer to the governance section or contact the brand team.
`;

  return content;
}

function generateFontsReference(brandKit: any): string {
  let content = `# Typography Specifications

## Font Families

`;

  if (brandKit.heading_font) content += `### Headings\n- **Font:** ${brandKit.heading_font}\n\n`;
  if (brandKit.body_font) content += `### Body Text\n- **Font:** ${brandKit.body_font}\n\n`;
  if (brandKit.paragraph_font) content += `### Paragraphs\n- **Font:** ${brandKit.paragraph_font}\n\n`;

  if (brandKit.fonts_list && Array.isArray(brandKit.fonts_list) && brandKit.fonts_list.length > 0) {
    content += `## Additional Fonts\n\n`;
    brandKit.fonts_list.forEach((font: any) => {
      const fontName = typeof font === 'string' ? font : font.name || font.family;
      content += `- ${fontName}\n`;
    });
    content += '\n';
  }

  if (brandKit.font_sizes && typeof brandKit.font_sizes === 'object') {
    content += `## Font Sizes\n\n`;
    Object.entries(brandKit.font_sizes).forEach(([key, value]) => {
      content += `- **${key}:** ${value}\n`;
    });
    content += '\n';
  }

  if (brandKit.font_weights && typeof brandKit.font_weights === 'object') {
    content += `## Font Weights\n\n`;
    Object.entries(brandKit.font_weights).forEach(([key, value]) => {
      content += `- **${key}:** ${value}\n`;
    });
    content += '\n';
  }

  content += `## Usage Notes

- Use heading fonts for titles, headers, and emphasis
- Use body fonts for paragraphs, descriptions, and general content
- Maintain consistent font pairing across all brand materials
`;

  return content;
}

// Phase 6: Generate Platform Style Guide
function generatePlatformStyleGuide(brandName: string, expression: any): string | null {
  if (!expression) return null;

  let content = `# ${brandName} Platform Style Guide

This guide provides platform-specific adaptations of the brand voice and style.

## General Principles

When adapting content for different platforms:
1. Maintain core brand voice across all platforms
2. Adjust tone and format for platform norms
3. Respect character limits and best practices
4. Stay true to voice archetypes

`;

  // Add voice archetypes summary if available
  if (expression.voice_archetypes) {
    const va = expression.voice_archetypes;
    if (va.primary?.name || va.secondary?.name) {
      content += `## Voice Foundation

`;
      if (va.primary?.name) {
        content += `**Lead with:** ${va.primary.name}
`;
        if (va.primary.description) content += `${va.primary.description}

`;
      }
      if (va.secondary?.name) {
        content += `**Support with:** ${va.secondary.name}
`;
        if (va.secondary.description) content += `${va.secondary.description}

`;
      }
    }
  }

  // Platform-specific guidelines
  content += `## Platform Adaptations

### Instagram
- **Tone:** Visual-first, personal, authentic
- **Format:** Use emojis sparingly, break into short paragraphs
- **Hashtags:** 5-10 relevant hashtags
- **Length:** 150-300 characters for captions (can go longer for stories)
- **Voice Shift:** More casual and approachable

### LinkedIn
- **Tone:** Professional, insightful, thought-leadership focused
- **Format:** Use line breaks for readability, limit emojis
- **Hashtags:** 3-5 industry-relevant hashtags
- **Length:** 1,300-2,000 characters optimal
- **Voice Shift:** More formal and authoritative

### Twitter/X
- **Tone:** Punchy, conversational, timely
- **Format:** Thread for longer content, use polls for engagement
- **Hashtags:** 1-2 maximum
- **Length:** Under 280 characters, aim for 100-150
- **Voice Shift:** More direct and casual

### Email
- **Tone:** Personal, helpful, clear
- **Format:** Scannable with headers and bullets
- **Length:** Keep under 200 words for marketing, adjust for newsletters
- **Voice Shift:** Professional but warm

### Blog/Long-form
- **Tone:** Educational, comprehensive, authoritative
- **Format:** Use headers, subheaders, bullets, and images
- **Length:** 800-2,000 words depending on topic
- **Voice Shift:** Most detailed and nuanced expression of voice

`;

  // Add content categories if available
  if (expression.content_categories && Array.isArray(expression.content_categories) && expression.content_categories.length > 0) {
    content += `## Content Category Templates

`;
    expression.content_categories.forEach((cat: any) => {
      content += `### ${cat.name}
`;
      if (cat.description) content += `${cat.description}

`;
      if (cat.typicalStructure) content += `**Structure:** ${cat.typicalStructure}
`;
      if (cat.toneShift) content += `**Tone Adjustment:** ${cat.toneShift}
`;
      if (cat.lengthGuidance) content += `**Length:** ${cat.lengthGuidance}
`;
      if (cat.keyPhrases && cat.keyPhrases.length > 0) {
        content += `**Key Phrases:** ${cat.keyPhrases.join(', ')}
`;
      }
      content += `
`;
    });
  }

  return content;
}

// Phase 6: Generate Voice Modifiers JSON
function generateVoiceModifiersJson(expression: any): string | null {
  if (!expression) return null;

  const modifiers: Record<string, any> = {
    version: "1.0",
    generated: new Date().toISOString(),
    platforms: {
      instagram: {
        formalityAdjust: -20,
        energyAdjust: +10,
        warmthAdjust: +15,
        emojiUsage: "moderate",
        hashtagStrategy: "relevant-niche",
        maxLength: 2200
      },
      linkedin: {
        formalityAdjust: +15,
        energyAdjust: 0,
        warmthAdjust: -5,
        emojiUsage: "minimal",
        hashtagStrategy: "industry-focused",
        maxLength: 3000
      },
      twitter: {
        formalityAdjust: -15,
        energyAdjust: +5,
        warmthAdjust: +10,
        emojiUsage: "sparse",
        hashtagStrategy: "trending-relevant",
        maxLength: 280
      },
      email: {
        formalityAdjust: +5,
        energyAdjust: -5,
        warmthAdjust: +10,
        emojiUsage: "none",
        hashtagStrategy: "none",
        maxLength: null
      },
      blog: {
        formalityAdjust: +10,
        energyAdjust: 0,
        warmthAdjust: 0,
        emojiUsage: "none",
        hashtagStrategy: "seo-keywords",
        maxLength: null
      }
    }
  };

  // Add base dimensions if available
  if (expression.tone_dimensions) {
    modifiers.baseDimensions = expression.tone_dimensions;
  }

  // Add voice archetypes if available
  if (expression.voice_archetypes) {
    modifiers.voiceArchetypes = {
      primary: expression.voice_archetypes.primary?.name || null,
      secondary: expression.voice_archetypes.secondary?.name || null,
      antiArchetypes: expression.voice_archetypes.antiArchetypes?.map((a: any) => a.name) || []
    };
  }

  // Add content categories if available
  if (expression.content_categories && Array.isArray(expression.content_categories)) {
    modifiers.contentCategories = expression.content_categories.map((cat: any) => ({
      name: cat.name,
      toneShift: cat.toneShift || null,
      keyPhrases: cat.keyPhrases || []
    }));
  }

  return JSON.stringify(modifiers, null, 2);
}

// Template content generator for curated templates (Phase 6: Added more templates)
function getTemplateContent(templateId: string): { filename: string; content: string } | null {
  const templates: Record<string, { filename: string; content: string }> = {
    'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c': {
      filename: 'negative-governance-dictionary.md',
      content: `# Negative Governance Dictionary

## Overview
This document defines language patterns, keywords, and phrases that AI should **never** generate when representing this brand. These are categorized by severity and type.

## Priority 1: Absolutely Banned (Hard Stop)
These phrases trigger immediate content rejection.

### Clichéd Openings
- "In today's world..."
- "In the ever-evolving landscape..."
- "As we navigate..."
- "In this day and age..."

### Corporate Jargon
- "Synergy" / "Synergize"
- "Leverage" (as a verb)
- "Circle back"
- "Touch base"
- "Move the needle"
- "Paradigm shift"
- "Low-hanging fruit"

### AI-Reveal Phrases
- "Delve" / "Delving"
- "Tapestry"
- "Landscape" (metaphorical)
- "Dive deep"
- "Unpack this"
- "At its core"

## Priority 2: Strongly Discouraged
Avoid unless contextually necessary.

### Filler Phrases
- "It's important to note that..."
- "It goes without saying..."
- "Needless to say..."
- "At the end of the day..."

### Vague Qualifiers
- "Very unique" (unique is absolute)
- "Fairly certain"
- "Basically"
- "Literally" (when not literal)

## Priority 3: Brand-Specific Avoidances
[Add brand-specific banned terms here]

## Enforcement
When generating content, cross-reference this dictionary before output. If a banned phrase is detected, rephrase using:
1. Concrete, specific language
2. Brand voice guidelines
3. Active voice alternatives
`
    },
    'd2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d': {
      filename: 'bias-ethics-audit-framework.md',
      content: `# Bias & Ethics Audit Framework

## Purpose
This framework ensures AI outputs do not amplify societal biases, perpetuate stereotypes, or generate harmful content when representing this brand.

## Synthetic Persona Testing

### Persona Categories
Test AI responses against these synthetic personas to detect bias:

#### Demographic Personas
1. **Age**: Young adult (18-25), Middle-aged (35-50), Senior (65+)
2. **Gender**: Male, Female, Non-binary
3. **Location**: Urban, Suburban, Rural
4. **Income**: Low, Middle, High
5. **Education**: High school, College, Graduate

#### Situational Personas
1. **First-time customer** - No prior brand knowledge
2. **Frustrated customer** - Has had negative experience
3. **Budget-conscious customer** - Price-sensitive decisions
4. **Expert user** - Deep domain knowledge
5. **Accessibility needs** - Visual, hearing, mobility considerations

## Audit Checklist

### Pre-Generation Checks
- [ ] Does the prompt avoid assumptions about user demographics?
- [ ] Are examples diverse and inclusive?
- [ ] Is language neutral and non-gendered (where appropriate)?

### Post-Generation Checks
- [ ] Response doesn't assume user's gender, age, or ability
- [ ] Cultural references are globally appropriate
- [ ] No stereotypical associations present
- [ ] Tone is consistent across all persona types
- [ ] Accessibility language is inclusive

## Red Flag Patterns

### Stereotyping Indicators
- Associating certain products with specific demographics
- Making assumptions about technical knowledge based on age
- Gendering products or services unnecessarily
- Geographic stereotypes in recommendations

### Harmful Hallucinations
- Fabricated statistics or studies
- Made-up customer testimonials
- False claims about competitors
- Invented product features

## Audit Schedule

| Audit Type | Frequency | Responsibility |
|------------|-----------|----------------|
| Spot check | Daily | AI operations team |
| Full persona sweep | Weekly | Brand compliance |
| Comprehensive bias audit | Monthly | Ethics committee |
| Third-party review | Quarterly | External auditor |

## Remediation Process

1. **Identify**: Log the biased output with full context
2. **Analyze**: Determine root cause (training data, prompt, model)
3. **Correct**: Update prompts, add to negative dictionary, or adjust guardrails
4. **Verify**: Re-test with same persona to confirm fix
5. **Document**: Record in audit log for future reference
`
    },
    // Phase 6: New templates
    'e3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e': {
      filename: 'common-mistakes-checklist.md',
      content: `# Common Mistakes Checklist

## Overview
This checklist identifies the most frequent brand violations to catch before finalizing any content.

## Visual Mistakes

### Color Errors
- [ ] Using generic blue instead of brand Primary color
- [ ] Applying gradients when flat colors are required
- [ ] Wrong color for dark/light mode context
- [ ] Insufficient contrast for accessibility

### Logo Mistakes
- [ ] Stretched or distorted logo (always maintain aspect ratio)
- [ ] Logo too small or too large for context
- [ ] Missing logo on first page/slide
- [ ] Using old/outdated logo version
- [ ] Logo placed on clashing background color

### Typography Mistakes
- [ ] Using non-approved fonts
- [ ] Mixing too many font families (max 2-3)
- [ ] Inconsistent heading hierarchy
- [ ] Text too small for readability

## Content Mistakes

### Tone & Voice
- [ ] Too formal or too casual for audience
- [ ] Inconsistent tone within same document
- [ ] Using banned phrases (see Negative Dictionary)
- [ ] Passive voice overuse

### Formatting
- [ ] Inconsistent date formats (use: Month DD, YYYY)
- [ ] Wrong currency format
- [ ] Decimal places inconsistent (currency: 2, percentage: 1)
- [ ] Missing document version/date

### Data Presentation
- [ ] Numbers not right-aligned in tables
- [ ] Missing data source citations
- [ ] Charts using non-brand colors
- [ ] Overly complex visualizations

## Before Publishing Checklist

1. [ ] Logo properly placed and sized
2. [ ] All colors match brand palette exactly
3. [ ] Fonts are consistent throughout
4. [ ] No typos or grammatical errors
5. [ ] Data is accurately presented
6. [ ] Professional tone maintained
7. [ ] Accessibility standards met
`
    },
    'f4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f': {
      filename: 'accessibility-standards.md',
      content: `# Accessibility Standards Guide

## Overview
Ensure all brand materials are accessible to people with disabilities, following WCAG 2.1 guidelines.

## Color Contrast Requirements

### Text Contrast Ratios
| Element | Minimum Ratio | Recommended |
|---------|---------------|-------------|
| Body text | 4.5:1 | 7:1 |
| Large text (18pt+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Non-text elements | 3:1 | 4.5:1 |

### How to Check
- Use tools like WebAIM Contrast Checker
- Test in grayscale to ensure information isn't color-dependent
- Always provide text alternatives for color-coded information

## Font Size Minimums

| Medium | Element | Minimum Size |
|--------|---------|--------------|
| Print | Body text | 11pt |
| Print | Captions | 9pt |
| Digital | Body text | 14px (16px recommended) |
| Digital | Captions | 12px |

## Alternative Text Guidelines

### Images
- Describe the content AND function of the image
- Keep alt text concise (under 125 characters)
- Use empty alt="" for decorative images
- Don't start with "Image of..." or "Picture of..."

### Charts & Graphs
- Provide text summary of key insights
- Include data table alternative
- Describe trends, not just data points

## Document Structure

### Headings
- Use proper heading hierarchy (H1 → H2 → H3)
- Don't skip heading levels
- Make headings descriptive and unique

### Links
- Use descriptive link text (not "click here")
- Indicate if link opens in new window
- Ensure links are visually distinguishable

## Multimedia

### Video
- Provide captions for all spoken content
- Include audio descriptions for visual information
- Offer transcript option

### Audio
- Provide full transcript
- Include speaker identification
- Note relevant non-speech audio

## Testing Checklist

- [ ] Contrast ratios meet minimum requirements
- [ ] All images have appropriate alt text
- [ ] Document has proper heading structure
- [ ] Links have descriptive text
- [ ] Videos have captions
- [ ] Content is navigable by keyboard
- [ ] Forms have proper labels
`
    },
    'a5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a': {
      filename: 'social-media-guidelines.md',
      content: `# Social Media Guidelines

## Platform-Specific Standards

### Instagram
- **Image Ratio**: 1:1 (feed), 9:16 (stories/reels)
- **Caption Length**: 2,200 max, but 125-150 optimal
- **Hashtags**: 3-5 relevant, brand-specific tags
- **Tone**: Visual-first, authentic, community-focused

### LinkedIn
- **Image Ratio**: 1.91:1 (landscape), 1:1 (square)
- **Post Length**: 1,300 max, 150-300 optimal for engagement
- **Tone**: Professional, thought-leadership, industry insights
- **Hashtags**: 3-5 industry-relevant tags

### Twitter/X
- **Character Limit**: 280 characters
- **Image Ratio**: 16:9 (landscape), 1:1 (square)
- **Tone**: Concise, timely, conversational
- **Hashtags**: 1-2 maximum

### Facebook
- **Image Ratio**: 1.91:1 (link posts), 1:1 (photo posts)
- **Post Length**: 40-80 characters for highest engagement
- **Tone**: Community-focused, informative, engaging
- **Best Practice**: Use native video when possible

### YouTube
- **Thumbnail Ratio**: 16:9 (1280x720 minimum)
- **Title Length**: 60 characters max (mobile truncation)
- **Description**: Front-load keywords in first 2 lines
- **Tone**: Educational, entertaining, value-driven

### TikTok
- **Video Ratio**: 9:16 (vertical)
- **Caption Length**: 150 characters recommended
- **Tone**: Authentic, trend-aware, entertaining
- **Hashtags**: 3-5 including trending when relevant

## Universal Guidelines

### Do's
- Respond to comments within 24 hours
- Use brand voice consistently across platforms
- Credit user-generated content properly
- Include calls-to-action when appropriate

### Don'ts
- Don't engage with trolls or negative comments emotionally
- Don't use all caps (except for emphasis)
- Don't over-hashtag
- Don't post without proofreading

## Crisis Response Protocol

1. **Pause** scheduled content immediately
2. **Assess** the situation with leadership
3. **Respond** with approved messaging only
4. **Monitor** conversations closely
5. **Document** for post-incident review
`
    },
    'b6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b': {
      filename: 'international-considerations.md',
      content: `# International Considerations

## Date & Time Formats

### By Region
| Region | Date Format | Example |
|--------|-------------|---------|
| US | Month DD, YYYY | January 15, 2025 |
| UK/EU | DD Month YYYY | 15 January 2025 |
| ISO (International) | YYYY-MM-DD | 2025-01-15 |
| Asia (varied) | YYYY年MM月DD日 | 2025年01月15日 |

### Best Practices
- Use full month names to avoid confusion
- Specify timezone for time-sensitive content
- Use 24-hour format for international audiences

## Currency Display

### Format by Currency
| Currency | Symbol | Format | Example |
|----------|--------|--------|---------|
| USD | $ | $X,XXX.XX | $1,234.56 |
| EUR | € | €X.XXX,XX | €1.234,56 |
| GBP | £ | £X,XXX.XX | £1,234.56 |
| JPY | ¥ | ¥X,XXX | ¥1,234 |

### Rules
- Always include currency code for international audiences
- Place symbol according to local convention
- Use local decimal/thousand separators

## Number Formatting

### Decimal Separators
- US/UK: Period (1,234.56)
- EU (most): Comma (1.234,56)
- Switzerland: Apostrophe (1'234.56)

### Thousand Separators
- US/UK: Comma (1,000)
- EU (most): Period or space (1.000 or 1 000)

## Language Considerations

### Translation Best Practices
- Avoid idioms that don't translate
- Leave room for text expansion (30-40% longer in some languages)
- Consider right-to-left languages in design
- Don't embed text in images

### Culturally Sensitive Topics
- Colors have different meanings globally
- Gestures (like thumbs up) vary by culture
- Religious/political symbols require care
- Seasonal references may not apply globally

## Legal Requirements by Region

### GDPR (EU)
- Cookie consent required
- Data processing disclosure
- Right to erasure compliance

### CCPA (California)
- "Do Not Sell My Info" option
- Privacy policy requirements
- Data access rights

### LGPD (Brazil)
- Similar to GDPR requirements
- Local data protection officer may be needed

## Measurement Units

| US | International |
|----|---------------|
| Fahrenheit | Celsius |
| Miles | Kilometers |
| Pounds | Kilograms |
| Gallons | Liters |
| Inches | Centimeters |

**Best Practice**: Provide both when targeting mixed audiences
`
    }
  };

  return templates[templateId] || null;
}

// Phase 5: Generate Python brand application script
function generateBrandApplicationScript(brandKit: any, sectionData: Record<string, any>): string {
  const colors: string[] = [];
  const cd = brandKit.color_details || {};
  const hasColorDetails = Object.keys(cd).some((k: string) => cd[k]?.light?.hex);

  if (hasColorDetails) {
    for (const [role, data] of Object.entries(cd) as [string, any][]) {
      if (data?.light?.hex) {
        const name = data.name || role;
        colors.push(`        "${role}": {"hex": "${data.light.hex}", "name": "${name}"}`);
      }
    }
  } else {
    if (brandKit.primary_color) colors.push(`        "primary": {"hex": "${brandKit.primary_color}", "name": "Primary"}`);
    if (brandKit.secondary_color) colors.push(`        "secondary": {"hex": "${brandKit.secondary_color}", "name": "Secondary"}`);
    if (brandKit.accent_color) colors.push(`        "accent": {"hex": "${brandKit.accent_color}", "name": "Accent"}`);
    if (brandKit.background_color) colors.push(`        "background": {"hex": "${brandKit.background_color}", "name": "Background"}`);
  }
  return `"""
Brand Application Module for ${brandKit.name}

This script applies consistent ${brandKit.name} branding to documents.
Generated by Brand Kit OS - ${new Date().toISOString().split('T')[0]}
"""

from typing import Any, Dict, List, Optional

class BrandFormatter:
    """Apply ${brandKit.name} brand guidelines to documents."""

    # Brand color definitions
    COLORS = {
${colors.length > 0 ? colors.join(',\n') : '        "primary": {"hex": "#000000", "name": "Primary"}'}
    }

    # Font definitions
    FONTS = {
        "heading": "${brandKit.heading_font || 'sans-serif'}",
        "body": "${brandKit.body_font || 'sans-serif'}",
        "paragraph": "${brandKit.paragraph_font || brandKit.body_font || 'sans-serif'}"
    }

    # Company information
    COMPANY = {
        "name": "${brandKit.name}",
        "tagline": "${brandKit.tagline || ''}",
        "website": "${brandKit.website_url || ''}"
    }

    def __init__(self):
        """Initialize brand formatter with standard settings."""
        self.colors = self.COLORS
        self.fonts = self.FONTS
        self.company = self.COMPANY

    def get_color(self, color_type: str) -> Optional[Dict[str, str]]:
        """Get color by type (primary, secondary, accent, background)."""
        return self.colors.get(color_type)

    def get_font(self, usage: str) -> str:
        """Get font for usage type (heading, body, paragraph)."""
        return self.fonts.get(usage, self.fonts["body"])

    def format_header_style(self) -> Dict[str, Any]:
        """Get standard header formatting for documents."""
        primary = self.get_color("primary")
        return {
            "font": self.get_font("heading"),
            "color": primary["hex"] if primary else "#000000",
            "bold": True,
            "size": 24
        }

    def format_body_style(self) -> Dict[str, Any]:
        """Get standard body text formatting."""
        return {
            "font": self.get_font("body"),
            "color": "#333333",
            "size": 11,
            "line_spacing": 1.15
        }

    def get_chart_palette(self, num_colors: int = 4) -> List[str]:
        """Get color palette for charts and graphs."""
        palette = [c["hex"] for c in self.colors.values() if c.get("hex")]
        return (palette * ((num_colors // len(palette)) + 1))[:num_colors] if palette else ["#000000"] * num_colors

    def format_email_signature(self, name: str, title: str, phone: str = "", email: str = "") -> str:
        """Generate branded email signature."""
        signature = f"{name}\\n{title}\\n"
        signature += f"{self.company['name']}"
        if self.company["tagline"]:
            signature += f" | {self.company['tagline']}"
        signature += "\\n"
        if phone or email:
            signature += f"{phone} | {email}\\n" if phone and email else f"{phone or email}\\n"
        if self.company["website"]:
            signature += self.company["website"]
        return signature


def apply_brand_to_document(document_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function to apply branding to any document type.

    Args:
        document_type: Type of document ('excel', 'powerpoint', 'pdf')
        config: Document configuration

    Returns:
        Branded configuration
    """
    formatter = BrandFormatter()
    branded_config = config.copy()
    
    branded_config["header_style"] = formatter.format_header_style()
    branded_config["body_style"] = formatter.format_body_style()
    branded_config["chart_colors"] = formatter.get_chart_palette()
    branded_config["company"] = formatter.COMPANY
    
    return branded_config


if __name__ == "__main__":
    # Example usage
    formatter = BrandFormatter()
    print(f"Brand: {formatter.company['name']}")
    print(f"Colors: {formatter.colors}")
    print(f"Fonts: {formatter.fonts}")
`;
}

// Phase 5: Generate Python brand validation script
function generateBrandValidationScript(brandKit: any, sectionData: Record<string, any>): string {
  const governance = sectionData.governance || {};
  const bannedTerms = governance.negative_directory || [];
  const bannedTermsStr = bannedTerms.slice(0, 10).map((t: string) => `        "${t}"`).join(',\n');

  // Build approved colors from color_details or flat columns
  const cd = brandKit.color_details || {};
  const hasColorDetails = Object.keys(cd).some((k: string) => cd[k]?.light?.hex);
  let approvedColorsStr: string;
  if (hasColorDetails) {
    const hexValues = Object.values(cd)
      .filter((v: any) => v?.light?.hex)
      .map((v: any) => `        "${v.light.hex}"`);
    approvedColorsStr = hexValues.length > 0 ? hexValues.join(',\n') : '        "#000000"';
  } else {
    approvedColorsStr = [
      `        "${brandKit.primary_color || '#000000'}"`,
      `        "${brandKit.secondary_color || '#333333'}"`,
      `        "${brandKit.accent_color || '#666666'}"`,
      `        "${brandKit.background_color || '#FFFFFF'}"`,
    ].join(',\n');
  }

  return `"""
Brand Validation Module for ${brandKit.name}

This script validates documents against ${brandKit.name} brand guidelines.
Generated by Brand Kit OS - ${new Date().toISOString().split('T')[0]}
"""

import re
from typing import List, Dict, Any, Tuple

class BrandValidator:
    """Validate content against ${brandKit.name} brand guidelines."""

    # Approved brand colors (hex codes)
    APPROVED_COLORS = [
${approvedColorsStr}
    ]

    # Banned terms and phrases
    BANNED_TERMS = [
${bannedTermsStr || '        "synergy",\n        "leverage"'}
    ]

    # AI-reveal phrases to avoid
    AI_REVEAL_PHRASES = [
        "delve", "delving", "tapestry", "landscape",
        "dive deep", "unpack this", "at its core",
        "in today's world", "in the ever-evolving"
    ]

    def __init__(self):
        """Initialize brand validator."""
        self.issues: List[Dict[str, Any]] = []

    def validate_colors(self, colors_used: List[str]) -> List[Dict[str, str]]:
        """
        Validate that colors match brand guidelines.
        
        Args:
            colors_used: List of hex color codes found in document
            
        Returns:
            List of color violations
        """
        violations = []
        approved_upper = [c.upper() for c in self.APPROVED_COLORS if c]
        
        for color in colors_used:
            if color.upper() not in approved_upper:
                violations.append({
                    "type": "color",
                    "issue": f"Non-brand color: {color}",
                    "suggestion": f"Replace with closest brand color"
                })
        
        return violations

    def validate_text(self, text: str) -> List[Dict[str, str]]:
        """
        Validate text for banned terms and AI-reveal phrases.
        
        Args:
            text: Content to validate
            
        Returns:
            List of text violations
        """
        violations = []
        text_lower = text.lower()
        
        # Check banned terms
        for term in self.BANNED_TERMS:
            if term.lower() in text_lower:
                violations.append({
                    "type": "banned_term",
                    "issue": f"Banned term found: '{term}'",
                    "suggestion": "Rephrase using brand-approved language"
                })
        
        # Check AI-reveal phrases
        for phrase in self.AI_REVEAL_PHRASES:
            if phrase.lower() in text_lower:
                violations.append({
                    "type": "ai_reveal",
                    "issue": f"AI-reveal phrase found: '{phrase}'",
                    "suggestion": "Rephrase to sound more natural"
                })
        
        return violations

    def validate_document(self, content: str, colors: List[str] = None) -> Dict[str, Any]:
        """
        Full document validation.
        
        Args:
            content: Document text content
            colors: Optional list of colors used in document
            
        Returns:
            Validation report
        """
        all_issues = []
        
        # Text validation
        text_issues = self.validate_text(content)
        all_issues.extend(text_issues)
        
        # Color validation
        if colors:
            color_issues = self.validate_colors(colors)
            all_issues.extend(color_issues)
        
        return {
            "valid": len(all_issues) == 0,
            "issue_count": len(all_issues),
            "issues": all_issues,
            "summary": self._generate_summary(all_issues)
        }

    def _generate_summary(self, issues: List[Dict[str, str]]) -> str:
        """Generate human-readable summary of issues."""
        if not issues:
            return "✅ Document passes all brand validation checks."
        
        summary = f"⚠️ Found {len(issues)} brand compliance issue(s):\\n"
        for i, issue in enumerate(issues[:5], 1):
            summary += f"  {i}. {issue['issue']}\\n"
        
        if len(issues) > 5:
            summary += f"  ... and {len(issues) - 5} more issues"
        
        return summary


def validate_content(content: str, colors: List[str] = None) -> Dict[str, Any]:
    """
    Main function to validate content against brand guidelines.
    
    Args:
        content: Text content to validate
        colors: Optional list of hex colors used
        
    Returns:
        Validation report
    """
    validator = BrandValidator()
    return validator.validate_document(content, colors)


if __name__ == "__main__":
    # Example usage
    sample_text = "Let's delve into synergy and leverage our strengths."
    result = validate_content(sample_text)
    print(result["summary"])
`;
}
