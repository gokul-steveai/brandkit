import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MCP Protocol version
const PROTOCOL_VERSION = "2024-11-05";

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

// Helper to hash API keys using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Rate limiting check
async function checkRateLimit(userId: string, supabaseAdmin: any): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  
  // Get current rate limit record for this user and function
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('function_name', 'mcp-server')
    .gte('window_start', windowStart.toISOString())
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking rate limit:', fetchError);
    // Allow request if we can't check rate limit (fail open)
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) };
  }

  if (!existing) {
    // No existing record in window, create new one
    const { error: insertError } = await supabaseAdmin
      .from('rate_limits')
      .insert({
        user_id: userId,
        function_name: 'mcp-server',
        request_count: 1,
        window_start: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating rate limit record:', insertError);
    }

    return { 
      allowed: true, 
      remaining: RATE_LIMIT_MAX_REQUESTS - 1, 
      resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) 
    };
  }

  // Check if limit exceeded
  if (existing.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetAt = new Date(new Date(existing.window_start).getTime() + RATE_LIMIT_WINDOW_MS);
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt 
    };
  }

  // Increment counter
  const { error: updateError } = await supabaseAdmin
    .from('rate_limits')
    .update({ 
      request_count: existing.request_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id);

  if (updateError) {
    console.error('Error updating rate limit:', updateError);
  }

  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.request_count - 1, 
    resetAt: new Date(new Date(existing.window_start).getTime() + RATE_LIMIT_WINDOW_MS) 
  };
}

// Validate API key and return user info
async function validateApiKey(authHeader: string | null, supabaseAdmin: any) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  
  // Hash the provided key to compare with stored hash
  const keyHash = await hashApiKey(apiKey);
  
  // Find the API key in the database
  const { data: keyData, error: keyError } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();

  if (keyError || !keyData) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check if key has expired
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Update last_used_at
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  return { valid: true, userId: keyData.user_id, keyData };
}

// Check if user has MCP access (paid plan)
async function checkSubscription(userId: string, supabaseAdmin: any) {
  const { data: subscription, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('subscription_tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !subscription) {
    return { hasAccess: false, tier: 'free' };
  }

  // MCP access is for paid plans only (base or premium)
  const hasAccess = subscription.subscription_tier === 'base' || subscription.subscription_tier === 'premium';
  return { hasAccess, tier: subscription.subscription_tier };
}

// MCP Tool definitions
const tools = [
  {
    name: "list_brand_kits",
    description: "List all brand kits the user has access to",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_brand_kit",
    description: "Get complete brand kit data by ID including all related data",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_core",
    description: "Get core identity (mission, vision, story) for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_personality",
    description: "Get personality traits, values, principles, and moods for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_expression",
    description: "Get tone of voice, verbal style, and visual style for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_products",
    description: "Get products and services for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_audience",
    description: "Get target audience personas for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_governance",
    description: "Get behavioral constraints, disclosure policies, and usage guidelines for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_brand_kit_personas",
    description: "Get AI personas configured for a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "list_knowledge_files",
    description: "List knowledge files associated with a brand kit",
    inputSchema: {
      type: "object",
      properties: {
        brand_kit_id: { type: "string", description: "The UUID of the brand kit" }
      },
      required: ["brand_kit_id"]
    }
  },
  {
    name: "get_knowledge_file",
    description: "Get metadata for a specific knowledge file",
    inputSchema: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "The UUID of the knowledge file" }
      },
      required: ["file_id"]
    }
  }
];

// MCP Resource templates
const resourceTemplates = [
  {
    uriTemplate: "brandkit://{brand_kit_id}",
    name: "Brand Kit",
    description: "Complete brand kit data as a resource",
    mimeType: "application/json"
  },
  {
    uriTemplate: "brandkit://{brand_kit_id}/core",
    name: "Brand Kit Core",
    description: "Core identity data (mission, vision, story)",
    mimeType: "application/json"
  },
  {
    uriTemplate: "brandkit://{brand_kit_id}/personality",
    name: "Brand Kit Personality",
    description: "Personality traits, values, and moods",
    mimeType: "application/json"
  },
  {
    uriTemplate: "brandkit://{brand_kit_id}/expression",
    name: "Brand Kit Expression",
    description: "Tone of voice and verbal style",
    mimeType: "application/json"
  },
  {
    uriTemplate: "brandkit://{brand_kit_id}/products",
    name: "Brand Kit Products",
    description: "Products and services",
    mimeType: "application/json"
  },
  {
    uriTemplate: "brandkit://{brand_kit_id}/audience",
    name: "Brand Kit Audience",
    description: "Target audience personas",
    mimeType: "application/json"
  },
  {
    uriTemplate: "brandkit://{brand_kit_id}/governance",
    name: "Brand Kit Governance",
    description: "Behavioral constraints and policies",
    mimeType: "application/json"
  }
];

// Tool execution handlers
async function executeTool(toolName: string, args: any, userId: string, supabaseAdmin: any) {
  console.log(`Executing tool: ${toolName} with args:`, args);

  switch (toolName) {
    case "list_brand_kits": {
      // Get brand kits owned by user or where user is a member
      const { data: owned, error: ownedError } = await supabaseAdmin
        .from('brand_kits')
        .select('id, name, description, tagline, website_url, created_at, updated_at')
        .eq('user_id', userId);

      const { data: memberOf, error: memberError } = await supabaseAdmin
        .from('brand_kit_members')
        .select('brand_kit_id, role, brand_kits:brand_kit_id(id, name, description, tagline, website_url, created_at, updated_at)')
        .eq('user_id', userId);

      if (ownedError) {
        console.error('Error fetching owned brand kits:', ownedError);
        return { error: ownedError.message };
      }

      const allBrandKits = [
        ...(owned || []).map((bk: any) => ({ ...bk, role: 'owner' })),
        ...(memberOf || []).map((m: any) => ({ ...m.brand_kits, role: m.role }))
      ];

      return { content: [{ type: "text", text: JSON.stringify(allBrandKits, null, 2) }] };
    }

    case "get_brand_kit": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) {
        return { error: "brand_kit_id is required" };
      }

      // Verify access
      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) {
        return { error: "Access denied to this brand kit" };
      }

      // Fetch all brand kit data
      const [
        { data: brandKit },
        { data: core },
        { data: personality },
        { data: expression },
        { data: governance },
        { data: products },
        { data: audience },
        { data: personas }
      ] = await Promise.all([
        supabaseAdmin.from('brand_kits').select('*').eq('id', brand_kit_id).maybeSingle(),
        supabaseAdmin.from('brand_kit_core').select('*').eq('brand_kit_id', brand_kit_id).maybeSingle(),
        supabaseAdmin.from('brand_kit_personality').select('*').eq('brand_kit_id', brand_kit_id).maybeSingle(),
        supabaseAdmin.from('brand_kit_expression').select('*').eq('brand_kit_id', brand_kit_id).maybeSingle(),
        supabaseAdmin.from('brand_kit_governance').select('*').eq('brand_kit_id', brand_kit_id).maybeSingle(),
        supabaseAdmin.from('brand_kit_products').select('*').eq('brand_kit_id', brand_kit_id),
        supabaseAdmin.from('brand_kit_target_audience').select('*').eq('brand_kit_id', brand_kit_id),
        supabaseAdmin.from('brand_kit_personas').select('*').eq('brand_kit_id', brand_kit_id)
      ]);

      const fullBrandKit = {
        ...brandKit,
        core,
        personality,
        expression,
        governance,
        products: products || [],
        target_audience: audience || [],
        personas: personas || []
      };

      return { content: [{ type: "text", text: JSON.stringify(fullBrandKit, null, 2) }] };
    }

    case "get_brand_kit_core": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_core')
        .select('*')
        .eq('brand_kit_id', brand_kit_id)
        .maybeSingle();

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_brand_kit_personality": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_personality')
        .select('*')
        .eq('brand_kit_id', brand_kit_id)
        .maybeSingle();

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_brand_kit_expression": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_expression')
        .select('*')
        .eq('brand_kit_id', brand_kit_id)
        .maybeSingle();

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_brand_kit_products": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_products')
        .select('*')
        .eq('brand_kit_id', brand_kit_id);

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
    }

    case "get_brand_kit_audience": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_target_audience')
        .select('*')
        .eq('brand_kit_id', brand_kit_id);

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
    }

    case "get_brand_kit_governance": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_governance')
        .select('*')
        .eq('brand_kit_id', brand_kit_id)
        .maybeSingle();

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_brand_kit_personas": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('brand_kit_personas')
        .select('*')
        .eq('brand_kit_id', brand_kit_id);

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
    }

    case "list_knowledge_files": {
      const { brand_kit_id } = args;
      if (!brand_kit_id) return { error: "brand_kit_id is required" };

      const hasAccess = await verifyBrandKitAccess(brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this brand kit" };

      const { data, error } = await supabaseAdmin
        .from('user_knowledge_file_uploads')
        .select('id, title, description, file_type, tags, created_at')
        .eq('brand_kit_id', brand_kit_id);

      if (error) return { error: error.message };
      return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
    }

    case "get_knowledge_file": {
      const { file_id } = args;
      if (!file_id) return { error: "file_id is required" };

      const { data, error } = await supabaseAdmin
        .from('user_knowledge_file_uploads')
        .select('*')
        .eq('id', file_id)
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: "Knowledge file not found" };

      // Verify the user has access to the brand kit this file belongs to
      const hasAccess = await verifyBrandKitAccess(data.brand_kit_id, userId, supabaseAdmin);
      if (!hasAccess) return { error: "Access denied to this knowledge file" };

      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// Verify user has access to a brand kit
async function verifyBrandKitAccess(brandKitId: string, userId: string, supabaseAdmin: any): Promise<boolean> {
  // Check if user owns the brand kit
  const { data: owned } = await supabaseAdmin
    .from('brand_kits')
    .select('id')
    .eq('id', brandKitId)
    .eq('user_id', userId)
    .maybeSingle();

  if (owned) return true;

  // Check if user is a member
  const { data: member } = await supabaseAdmin
    .from('brand_kit_members')
    .select('id')
    .eq('brand_kit_id', brandKitId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!member;
}

// Handle resource reads
async function readResource(uri: string, userId: string, supabaseAdmin: any) {
  console.log(`Reading resource: ${uri}`);

  // Parse the URI
  const match = uri.match(/^brandkit:\/\/([^/]+)(\/(.+))?$/);
  if (!match) {
    return { error: `Invalid resource URI: ${uri}` };
  }

  const brandKitId = match[1];
  const subResource = match[3];

  // Verify access
  const hasAccess = await verifyBrandKitAccess(brandKitId, userId, supabaseAdmin);
  if (!hasAccess) {
    return { error: "Access denied to this brand kit" };
  }

  // Map sub-resource to tool
  const toolMapping: Record<string, string> = {
    'core': 'get_brand_kit_core',
    'personality': 'get_brand_kit_personality',
    'expression': 'get_brand_kit_expression',
    'products': 'get_brand_kit_products',
    'audience': 'get_brand_kit_audience',
    'governance': 'get_brand_kit_governance',
    'personas': 'get_brand_kit_personas'
  };

  if (!subResource) {
    // Return full brand kit
    return await executeTool('get_brand_kit', { brand_kit_id: brandKitId }, userId, supabaseAdmin);
  }

  const toolName = toolMapping[subResource];
  if (!toolName) {
    return { error: `Unknown sub-resource: ${subResource}` };
  }

  return await executeTool(toolName, { brand_kit_id: brandKitId }, userId, supabaseAdmin);
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabaseAdmin: any = null;
  let userId: string = '';
  let apiKeyId: string | null = null;
  let method: string = 'unknown';
  let toolName: string | null = null;

  // Helper function to log request
  async function logRequest(status: string, errorMessage?: string) {
    if (!supabaseAdmin || !userId) return;
    
    try {
      await supabaseAdmin.from('mcp_request_logs').insert({
        user_id: userId,
        api_key_id: apiKeyId,
        method: method,
        tool_name: toolName,
        request_status: status,
        error_message: errorMessage || null,
        response_time_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error('Failed to log MCP request:', logError);
    }
  }

  try {
    supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key
    const authHeader = req.headers.get('Authorization');
    const validation = await validateApiKey(authHeader, supabaseAdmin);
    
    if (!validation.valid) {
      console.error('API key validation failed:', validation.error);
      return new Response(
        JSON.stringify({ 
          jsonrpc: "2.0", 
          error: { code: -32001, message: validation.error },
          id: null 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    userId = validation.userId!;
    apiKeyId = validation.keyData?.id || null;

    // Check subscription
    const subscription = await checkSubscription(userId, supabaseAdmin);
    if (!subscription.hasAccess) {
      console.error('User does not have MCP access. Tier:', subscription.tier);
      await logRequest('error', 'Subscription required');
      return new Response(
        JSON.stringify({ 
          jsonrpc: "2.0", 
          error: { code: -32002, message: "MCP access requires a paid subscription (Base or Premium plan)" },
          id: null 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(userId, supabaseAdmin);
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for user ${userId}. Reset at: ${rateLimit.resetAt.toISOString()}`);
      await logRequest('rate_limited', 'Rate limit exceeded');
      return new Response(
        JSON.stringify({ 
          jsonrpc: "2.0", 
          error: { code: -32003, message: "Rate limit exceeded. Maximum 100 requests per minute. Please try again later." },
          id: null 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
          } 
        }
      );
    }

    // Parse MCP request
    const body = await req.json();
    console.log('MCP Request:', JSON.stringify(body));

    const { jsonrpc, method: reqMethod, params, id } = body;
    method = reqMethod || 'unknown';

    if (jsonrpc !== "2.0") {
      await logRequest('error', 'Invalid JSON-RPC version');
      return new Response(
        JSON.stringify({ 
          jsonrpc: "2.0", 
          error: { code: -32600, message: "Invalid JSON-RPC version" },
          id 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let result;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
            resources: { subscribe: false, listChanged: false },
            prompts: {}
          },
          serverInfo: {
            name: "brand-kit-os",
            version: "1.0.0"
          }
        };
        break;

      case "tools/list":
        result = { tools };
        break;

      case "tools/call":
        const { name, arguments: toolArgs } = params;
        toolName = name;
        result = await executeTool(name, toolArgs || {}, userId, supabaseAdmin);
        break;

      case "resources/list":
        // List available brand kits as resources
        const { data: brandKits } = await supabaseAdmin
          .from('brand_kits')
          .select('id, name')
          .eq('user_id', userId);

        const resources = (brandKits || []).flatMap((bk: { id: string; name: string }) => [
          {
            uri: `brandkit://${bk.id}`,
            name: bk.name,
            description: `Complete brand kit: ${bk.name}`,
            mimeType: "application/json"
          },
          {
            uri: `brandkit://${bk.id}/core`,
            name: `${bk.name} - Core`,
            description: `Core identity for ${bk.name}`,
            mimeType: "application/json"
          },
          {
            uri: `brandkit://${bk.id}/personality`,
            name: `${bk.name} - Personality`,
            description: `Personality traits for ${bk.name}`,
            mimeType: "application/json"
          }
        ]);

        result = { resources };
        break;

      case "resources/templates/list":
        result = { resourceTemplates };
        break;

      case "resources/read":
        result = await readResource(params.uri, userId, supabaseAdmin);
        break;

      case "prompts/list":
        result = { prompts: [] };
        break;

      case "notifications/initialized":
        // Client notification, no response needed
        await logRequest('success');
        return new Response(null, { 
          status: 204, 
          headers: corsHeaders 
        });

      default:
        await logRequest('error', `Method not found: ${method}`);
        result = { 
          error: { code: -32601, message: `Method not found: ${method}` } 
        };
    }

    // Log successful request
    const hasError = result?.error !== undefined;
    await logRequest(hasError ? 'error' : 'success', hasError ? result.error?.message : undefined);

    console.log('MCP Response:', JSON.stringify({ jsonrpc: "2.0", result, id }));

    return new Response(
      JSON.stringify({ jsonrpc: "2.0", result, id }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
        } 
      }
    );

  } catch (error: any) {
    console.error('MCP Server Error:', error);
    await logRequest('error', error?.message || 'Internal error');
    return new Response(
      JSON.stringify({ 
        jsonrpc: "2.0", 
        error: { code: -32603, message: error?.message || 'Internal error' },
        id: null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
