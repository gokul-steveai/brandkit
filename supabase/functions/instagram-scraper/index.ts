import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { isValidUUID, verifyBrandKitOwnership } from "../_shared/auth.ts";

// The correct Apify actor that supports directUrls
const APIFY_ACTOR = "apify~instagram-scraper";

// Result limits by mode
const RESULT_LIMITS: Record<string, number> = {
  details: 5,
  posts: 200,
  comments: 2000, // For future use
};

interface RequestBody {
  url: string;
  mode: "details" | "posts";
  resultsLimit?: number;
  brandKitId?: string;
  profileType?: string;
  // Note: userId is intentionally NOT accepted - always derived from authenticated user
}

function extractInstagramUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/\/$/, "");
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      return parts[0];
    }
    return null;
  } catch {
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : null;
  }
}

async function downloadAndSaveMedia(
  supabase: SupabaseClient,
  mediaUrl: string,
  storagePath: string,
  bucket: string
): Promise<string | null> {
  try {
    console.log(`[Media] Downloading: ${mediaUrl}`);

    const response = await fetch(mediaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
      },
    });

    if (!response.ok) {
      console.error(`[Media] Failed to download: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, uint8Array, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[Media] Upload error: ${uploadError.message}`);
      return null;
    }

    console.log(`[Media] Saved to: ${storagePath}`);
    return storagePath;
  } catch (error) {
    console.error(`[Media] Error: ${error}`);
    return null;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  try {
    // ========== SECURITY: Validate JWT ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Use authenticated user ID instead of client-provided userId
    const userId = user.id;

    const body: RequestBody = await req.json();
    const { url, mode, resultsLimit, brandKitId, profileType } = body;

    console.log(`[Instagram Scraper] Request received:`, {
      url,
      mode,
      resultsLimit,
      brandKitId,
      profileType,
      userId, // Now from authenticated user
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mode || !["details", "posts"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Mode must be 'details' or 'posts'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize service client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== SECURITY: Verify brand kit ownership if provided ==========
    if (brandKitId) {
      if (!isValidUUID(brandKitId)) {
        return new Response(
          JSON.stringify({ error: "Invalid brand kit ID format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isOwner = await verifyBrandKitOwnership(supabase, brandKitId, userId);
      if (!isOwner) {
        console.log(`[Instagram Scraper] User ${userId} denied access to brand kit ${brandKitId}`);
        return new Response(
          JSON.stringify({ error: "Not authorized to access this brand kit" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get API token
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_API_TOKEN) {
      console.error("[Instagram Scraper] APIFY_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine results limit
    const limit = resultsLimit || RESULT_LIMITS[mode] || 5;

    // Build Apify input - using directUrls schema
    const apifyInput = {
      addParentData: false,
      directUrls: [url],
      resultsLimit: limit,
      resultsType: mode,
      searchLimit: 1,
      searchType: mode === "details" ? "user" : "hashtag",
    };

    console.log(`[Instagram Scraper] Apify actor: ${APIFY_ACTOR}`);
    console.log(`[Instagram Scraper] Apify input:`, JSON.stringify(apifyInput, null, 2));

    // Call Apify API
    const apifyUrl = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

    const apifyResponse = await fetch(apifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apifyInput),
    });

    console.log(`[Instagram Scraper] Apify response status: ${apifyResponse.status}`);

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error(`[Instagram Scraper] Apify error: ${errorText}`);

      // Don't leak Apify error details to client
      return new Response(
        JSON.stringify({ error: "Failed to fetch Instagram data" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apifyData = await apifyResponse.json();
    console.log(`[Instagram Scraper] Apify returned ${Array.isArray(apifyData) ? apifyData.length : 0} items`);

    if (!apifyData || (Array.isArray(apifyData) && apifyData.length === 0)) {
      return new Response(
        JSON.stringify({ error: "No data returned from Instagram" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const username = extractInstagramUsername(url) || "unknown";
    const bucket = "social-profile-images";

    // Process based on mode
    if (mode === "details") {
      // For details, return the first profile data
      const profileData = Array.isArray(apifyData) ? apifyData[0] : apifyData;

      // Download and save profile image if available
      if (profileData.profilePicUrlHD && brandKitId) {
        const imagePath = `${brandKitId}/${userId}/instagram/profile/${username}_profile.jpg`;
        const savedPath = await downloadAndSaveMedia(supabase, profileData.profilePicUrlHD, imagePath, bucket);
        if (savedPath) {
          profileData.localProfileImagePath = savedPath;
        }
      }

      console.log(`[Instagram Scraper] Details scrape complete for: ${username}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: profileData,
          mode: "details",
          username,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (mode === "posts") {
      // For posts, process and save media
      const posts = Array.isArray(apifyData) ? apifyData : [apifyData];

      console.log(`[Instagram Scraper] Processing ${posts.length} posts`);

      let savedJsonPath: string | null = null;

      // Download media for each post (limit concurrent downloads)
      if (brandKitId) {
        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          const postId = post.id || post.shortCode || `post_${i}`;

          // Download display image
          if (post.displayUrl) {
            const imagePath = `${brandKitId}/${userId}/instagram/photos/${postId}.jpg`;
            const savedPath = await downloadAndSaveMedia(supabase, post.displayUrl, imagePath, bucket);
            if (savedPath) {
              // Store full public URL with correct field name for ViewPostsDialog
              post.localDisplayUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${savedPath}`;
            }
          }

          // Download video if present
          if (post.videoUrl) {
            const videoPath = `${brandKitId}/${userId}/instagram/videos/${postId}.mp4`;
            const savedPath = await downloadAndSaveMedia(supabase, post.videoUrl, videoPath, bucket);
            if (savedPath) {
              // Store full public URL with correct field name for ViewPostsDialog
              post.localVideoPreviewUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${savedPath}`;
            }
          }
        }

        // Save posts JSON to storage
        const jsonPath = `${brandKitId}/${userId}/instagram/posts/posts_${Date.now()}.json`;
        const { error: jsonError } = await supabase.storage
          .from("apify-scrapes")
          .upload(jsonPath, JSON.stringify(posts, null, 2), {
            contentType: "application/json",
            upsert: true,
          });

        if (jsonError) {
          console.error(`[Instagram Scraper] Failed to save posts JSON: ${jsonError.message}`);
        } else {
          console.log(`[Instagram Scraper] Posts JSON saved to: ${jsonPath}`);
          savedJsonPath = jsonPath;

          // Update social_profiles table with post_storage_path and data_source
          console.log(`[Instagram Scraper] Attempting to update social_profiles with post_storage_path: ${jsonPath}`);
          console.log(`[Instagram Scraper] Query params: brandKitId=${brandKitId}, platform=instagram, profileType=${profileType || 'personal'}`);

          const { data: updatedProfile, error: updateError } = await supabase
            .from("social_profiles")
            .update({
              post_storage_path: jsonPath,
              data_source: 'apify'
            })
            .eq("brand_kit_id", brandKitId)
            .eq("platform", "instagram")
            .eq("profile_type", profileType || "personal")
            .select()
            .single();

          if (updateError) {
            console.error(`[Instagram Scraper] Failed to update social_profiles: ${updateError.message}`);
            console.error(`[Instagram Scraper] Update error details:`, JSON.stringify(updateError));
          } else if (!updatedProfile) {
            console.error(`[Instagram Scraper] No profile found to update - profile may not exist in database`);
          } else {
            console.log(`[Instagram Scraper] Successfully updated social_profiles with post_storage_path`);
            console.log(`[Instagram Scraper] Updated profile ID: ${updatedProfile.id}`);
          }
        }

        // Deduct credits for posts scraping
        const { error: creditError } = await supabase.rpc("deduct_credits", {
          p_user_id: userId,
          p_amount: 1,
          p_description: "Instagram posts scrape",
        });

        if (creditError) {
          console.log(`[Instagram Scraper] Credit deduction note: ${creditError.message}`);
        }
      }

      console.log(`[Instagram Scraper] Posts scrape complete: ${posts.length} posts processed`);

      return new Response(
        JSON.stringify({
          success: true,
          data: posts,
          mode: "posts",
          username,
          count: posts.length,
          storagePath: savedJsonPath,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback (shouldn't reach here)
    return new Response(
      JSON.stringify({ error: "Invalid mode" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error(`[Instagram Scraper] Unhandled error:`, error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }), // Generic error for security
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
