import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const N8N_WEBHOOK_URL = "https://brandkitos.app.n8n.cloud/webhook/095e541c-d07a-4b8d-8cab-2d34ccf71ca5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate Instagram URL format to prevent SSRF attacks
function isValidInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'instagram.com' || 
           hostname === 'www.instagram.com' ||
           hostname.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[instagram-analysis] Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Authentication is optional for this public free tool
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    // Only try to get claims if it looks like a JWT (has 3 parts separated by dots)
    // and is not the anon key (which doesn't contain user claims)
    if (token.split('.').length === 3 && token !== supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (e) {
        // Ignore auth errors for this public tool
        console.log("[instagram-analysis] Optional auth failed, continuing as anonymous");
      }
    }
  }

  console.log(`[instagram-analysis] Request from ${userId ? `user: ${userId}` : 'anonymous user'}`);

  try {
    const { instagramUrl, resultsType, timestamp, source } = await req.json();

    if (!instagramUrl) {
      return new Response(
        JSON.stringify({ error: "Instagram URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Instagram URL to prevent SSRF attacks
    if (!isValidInstagramUrl(instagramUrl)) {
      console.log(`[instagram-analysis] Invalid Instagram URL rejected: ${instagramUrl}`);
      return new Response(
        JSON.stringify({ error: "Invalid Instagram URL. Only instagram.com URLs are allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[instagram-analysis] Analyzing: ${instagramUrl}${userId ? ` for user: ${userId}` : ''}`);

    const params = new URLSearchParams({
      instagramUrl,
      resultsType: resultsType || 'details',
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'brandkitos-wizard'
    });

    const response = await fetch(`${N8N_WEBHOOK_URL}?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error(`[instagram-analysis] n8n webhook error: ${response.status}`);
      throw new Error(`Webhook error: ${response.status}`);
    }

    // Read the response as text (n8n returns NDJSON - newline-delimited JSON)
    const rawData = await response.text();
    
    console.log(`[instagram-analysis] Successfully retrieved data for: ${instagramUrl}`);
    console.log(`[instagram-analysis] Raw response length: ${rawData.length} chars`);

    // Parse response - supports both JSON array and NDJSON formats
    let profileData = null;
    let writingStyleReport = null;

    // First, try to parse as direct JSON array (new n8n format)
    // Format: [{"output":{"writing_style_specification":{...}}}]
    try {
      const directJson = JSON.parse(rawData);
      
      if (Array.isArray(directJson)) {
        console.log(`[instagram-analysis] Parsing JSON array with ${directJson.length} items`);
        
        for (const item of directJson) {
          // Check for writing style report in output.writing_style_specification
          if (item.output?.writing_style_specification) {
            writingStyleReport = item.output.writing_style_specification;
            console.log(`[instagram-analysis] Found writing_style_specification in array response`);
          }
          // Check for profile data (if it comes in the same array)
          else if (item["Profile Information "] || item["Latest Posts"] || item["Latest Videos "]) {
            profileData = item;
            console.log(`[instagram-analysis] Found profile data in array response`);
          }
          // Handle case where profile data is nested in output
          else if (item.output?.["Profile Information "] || item.output?.["Latest Posts"]) {
            profileData = item.output;
            console.log(`[instagram-analysis] Found nested profile data in array response`);
          }
        }
      }
      // Handle single object response format
      else if (directJson.output?.writing_style_specification) {
        writingStyleReport = directJson.output.writing_style_specification;
        console.log(`[instagram-analysis] Found writing_style_specification in object response`);
      }
      // Direct profile data object
      else if (directJson["Profile Information "] || directJson["Latest Posts"]) {
        profileData = directJson;
        console.log(`[instagram-analysis] Found direct profile data object`);
      }
    } catch {
      // Not valid JSON, fall back to NDJSON parsing
      console.log(`[instagram-analysis] Response is not JSON array/object, trying NDJSON parsing`);
    }

    // Fall back to NDJSON parsing if direct JSON didn't find both items
    if (!profileData || !writingStyleReport) {
      const lines = rawData.split('\n').filter(line => line.trim());
      console.log(`[instagram-analysis] NDJSON fallback: parsing ${lines.length} lines`);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          
          // Look for "item" types which contain the actual data
          if (parsed.type === 'item' && parsed.content) {
            const content = typeof parsed.content === 'string' ? JSON.parse(parsed.content) : parsed.content;
            
            console.log(`[instagram-analysis] Found item with keys: ${Object.keys(content).join(', ')}`);
            
            // Check if this is profile data (has profile-specific keys)
            if (!profileData && (content["Profile Information "] || content["Latest Posts"] || content["Latest Videos "])) {
              profileData = content;
              console.log(`[instagram-analysis] Identified as profile data`);
            } 
            // Check if this is a writing style report
            else if (!writingStyleReport && (content.reportTitle || content.sections || content.writingStyle || 
                     content.writing_style_specification || content.title || content.summary || content.analysis)) {
              writingStyleReport = content.writing_style_specification || content;
              console.log(`[instagram-analysis] Identified as writing style report`);
            }
            // Fallback assignments
            else if (!profileData) {
              profileData = content;
              console.log(`[instagram-analysis] Fallback: treating as profile data`);
            } 
            else if (!writingStyleReport) {
              writingStyleReport = content;
              console.log(`[instagram-analysis] Fallback: treating as writing style report`);
            }
          }
          
          // Handle legacy format where response is already the profile data
          if (!profileData && (parsed.inputUrl || parsed.username)) {
            profileData = parsed;
          }
        } catch {
          // Skip lines that aren't valid JSON
          console.log(`[instagram-analysis] Skipping non-JSON line`);
        }
      }
    }

    if (!profileData) {
      console.error("[instagram-analysis] Could not extract profile data from response");
      throw new Error("Failed to parse profile data from webhook response");
    }

    // Return combined response with both profile data and writing style report
    const responseData = {
      profileData,
      writingStyleReport
    };

    console.log(`[instagram-analysis] Returning response with profileData: ${!!profileData}, writingStyleReport: ${!!writingStyleReport}`);

    return new Response(JSON.stringify(responseData), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json"
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[instagram-analysis] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
