import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";


const N8N_WEBHOOK_URL = "https://brandkitos.app.n8n.cloud/webhook/34970748-922e-4ad2-a46f-abefe7cdb4e3";

// Apify Instagram Profile Scraper Actor ID
const APIFY_INSTAGRAM_ACTOR = "apify~instagram-profile-scraper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to generate storage path based on profile type
function generateStoragePath(
  brandKitId: string,
  userId: string | null,
  platform: string,
  profileType: string,
  scrapeType: 'profile' | 'posts' | 'comments',
  fileId: string
): string {
  // Personal: BrandKitId/UserId/platform/scrapeType/file
  // Company: BrandKitId/platform/scrapeType/file
  if (profileType === 'personal' && userId) {
    return `${brandKitId}/${userId}/${platform}/${scrapeType}/${fileId}.json`;
  }
  return `${brandKitId}/${platform}/${scrapeType}/${fileId}.json`;
}

// Helper to download and save media to storage bucket
async function downloadAndSaveMedia(
  supabase: any,
  mediaUrl: string,
  brandKitId: string,
  platform: string,
  profileType: string,
  userId: string | null,
  mediaType: 'photos' | 'videos'
): Promise<string | null> {
  try {
    console.log(`[Media] Downloading ${mediaType}: ${mediaUrl}`);
    
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      console.error(`[Media] Failed to download: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('video') ? 'mp4' : contentType.includes('png') ? 'png' : 'jpg';
    const fileId = crypto.randomUUID();
    
    // Path structure: brandKitId/[userId]/platform/mediaType/file
    const basePath = profileType === 'personal' && userId 
      ? `${brandKitId}/${userId}/${platform}/${mediaType}`
      : `${brandKitId}/${platform}/${mediaType}`;
    const storagePath = `${basePath}/${fileId}.${extension}`;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('social-profile-images')
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[Media] Upload error:`, uploadError);
      return null;
    }

    console.log(`[Media] Successfully saved to: ${storagePath}`);
    return storagePath;
  } catch (error) {
    console.error(`[Media] Error downloading media:`, error);
    return null;
  }
}

// Helper to extract username from Instagram URL
function extractInstagramUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([^\/\?]+)/i);
  if (match && match[1]) {
    // Remove @ if present
    return match[1].replace('@', '');
  }
  return null;
}

// Helper to call Apify Instagram scraper
async function scrapeInstagramWithApify(
  url: string,
  apiToken: string,
  resultsType: 'details' | 'posts' = 'details',
  resultsLimit: number = 10
): Promise<{ data: any; error?: string }> {
  console.log(`[Apify] Starting Instagram scrape for URL: ${url}, type: ${resultsType}`);
  
  const actorRunUrl = `https://api.apify.com/v2/acts/${APIFY_INSTAGRAM_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
  
  // Build request body based on resultsType
  let requestBody: Record<string, any>;
  
  if (resultsType === 'posts') {
    // For posts, use usernames (required by Apify) - no searchLimit for posts
    const username = extractInstagramUsername(url);
    if (!username) {
      console.error(`[Apify] Could not extract username from URL: ${url}`);
      return { data: null, error: 'Could not extract Instagram username from URL' };
    }

    console.log(`[Apify] Extracted username for posts: ${username}`);
    requestBody = {
      usernames: [username],
      resultsLimit: resultsLimit,
      resultsType: 'posts',
      addParentData: false,
    };
  } else {
    // For profile details, Apify also requires `usernames`
    const username = extractInstagramUsername(url);
    if (!username) {
      console.error(`[Apify] Could not extract username from URL: ${url}`);
      return { data: null, error: 'Could not extract Instagram username from URL' };
    }

    console.log(`[Apify] Extracted username for details: ${username}`);
    requestBody = {
      usernames: [username],
      resultsLimit: 1,
      resultsType: 'details',
      addParentData: false,
    };
  }
  
  console.log(`[Apify] Request body:`, JSON.stringify(requestBody));
  
  const response = await fetch(actorRunUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Apify] API error: ${response.status} - ${errorText}`);

    try {
      const parsed = JSON.parse(errorText);
      const msg = parsed?.error?.message ?? errorText;
      return { data: null, error: `Apify API error: ${response.status} - ${msg}` };
    } catch {
      return { data: null, error: `Apify API error: ${response.status} - ${errorText}` };
    }
  }

  const data = await response.json();
  console.log(`[Apify] Successfully scraped Instagram, got ${data?.length || 0} results`);
  
  // For posts, return all results; for details, return first result
  if (resultsType === 'posts') {
    return { data: Array.isArray(data) ? data : [data] };
  }
  return { data: Array.isArray(data) && data.length > 0 ? data[0] : data };
}

// Calculate credit cost for posts (1 credit per 10 posts, with 5+ rounding up)
function calculatePostsCreditCost(postsCount: number): number {
  if (postsCount <= 0) return 0;
  const base = Math.floor(postsCount / 10);
  const remainder = postsCount % 10;
  return remainder >= 5 ? base + 1 : Math.max(base, 1);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      brandKitName, 
      platform, 
      profileType, 
      url, 
      timestamp, 
      userId, 
      brandKitId,
      scrapeType = 'profile', // 'profile' or 'posts'
      resultsLimit = 200,
    } = await req.json();

    console.log(`Processing social profile scrape request:`, {
      brandKitName,
      platform,
      profileType,
      url,
      timestamp,
      userId,
      brandKitId,
      scrapeType,
      resultsLimit,
    });

    if (!platform || !profileType || !url) {
      console.error("Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields: platform, profileType, url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let data: any;
    let storagePath: string;
    let storageBucket = "apify-scrapes";

    // Use Apify for Instagram, n8n for other platforms
    if (platform === "instagram") {
      const apifyToken = Deno.env.get("APIFY_API_TOKEN");
      if (!apifyToken) {
        console.error("APIFY_API_TOKEN not configured");
        return new Response(
          JSON.stringify({ error: "Instagram scraping not configured. Please contact support." }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Determine Apify results type based on scrapeType
      const apifyResultsType = scrapeType === 'posts' ? 'posts' : 'details';
      
      const result = await scrapeInstagramWithApify(url, apifyToken, apifyResultsType, resultsLimit);
      if (result.error || !result.data) {
        return new Response(
          JSON.stringify({ error: result.error || "Failed to scrape Instagram profile" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      data = result.data;
      
      // Generate storage path with proper structure
      const fileId = crypto.randomUUID();
      storagePath = generateStoragePath(brandKitId, userId, platform, profileType, scrapeType, fileId);
      
      console.log(`Uploading to apify-scrapes bucket: ${storagePath}`);
      
      // Process and download media for posts
      if (scrapeType === 'posts' && Array.isArray(data)) {
        console.log(`[Posts] Processing ${data.length} posts for media download`);
        
        for (const post of data) {
          // Download display image (photo or video thumbnail)
          if (post.displayUrl) {
            const mediaType = post.type === 'Video' ? 'videos' : 'photos';
            const localPath = await downloadAndSaveMedia(
              supabase,
              post.displayUrl,
              brandKitId,
              platform,
              profileType,
              userId,
              mediaType === 'videos' ? 'videos' : 'photos'
            );
            if (localPath) {
              post.localDisplayPath = localPath;
            }
          }
          
          // For videos, also try to download video preview/thumbnail
          if (post.type === 'Video' && post.videoUrl) {
            const localVideoPath = await downloadAndSaveMedia(
              supabase,
              post.videoUrl,
              brandKitId,
              platform,
              profileType,
              userId,
              'videos'
            );
            if (localVideoPath) {
              post.localVideoPath = localVideoPath;
            }
          }
        }
      }
      
      const { error: uploadError } = await supabase.storage
        .from("apify-scrapes")
        .upload(storagePath, JSON.stringify(data, null, 2), {
          contentType: "application/json",
          upsert: false,
        });

      if (uploadError) {
        console.error(`Storage upload error:`, uploadError);
        storagePath = "";
      } else {
        console.log(`Successfully uploaded to apify-scrapes: ${storagePath}`);
      }

      // For posts, update the social_profiles table with post_storage_path
      if (scrapeType === 'posts' && storagePath && brandKitId) {
        const { error: updateError } = await supabase
          .from('social_profiles')
          .update({ post_storage_path: storagePath })
          .eq('brand_kit_id', brandKitId)
          .eq('platform', platform)
          .eq('profile_type', profileType);

        if (updateError) {
          console.error('Failed to update post_storage_path:', updateError);
        } else {
          console.log('Updated post_storage_path for profile');
        }

        // Deduct credits for posts scraping
        const postsCount = Array.isArray(data) ? data.length : 0;
        const creditCost = calculatePostsCreditCost(postsCount);
        
        if (userId && creditCost > 0) {
          // Get current subscription
          const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('tokens_balance, tokens_used_this_period')
            .eq('user_id', userId)
            .single();

          if (!subError && subscription) {
            const newBalance = Math.max(0, subscription.tokens_balance - creditCost);
            const newUsed = subscription.tokens_used_this_period + creditCost;

            // Update subscription
            await supabase
              .from('user_subscriptions')
              .update({
                tokens_balance: newBalance,
                tokens_used_this_period: newUsed,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            // Log transaction
            await supabase.from('token_transactions').insert({
              user_id: userId,
              brand_kit_id: brandKitId,
              transaction_type: 'api_usage',
              tokens_amount: -creditCost,
              tokens_balance_after: newBalance,
              function_name: 'social-profile-posts',
              description: `Scraped ${postsCount} Instagram posts`,
            });

            console.log(`Deducted ${creditCost} credits for ${postsCount} posts`);
          }
        }
      }
    } else {
      // Use n8n webhook for other platforms
      console.log(`Forwarding request to n8n webhook for platform: ${platform}`);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brandKitName,
          platform,
          profileType,
          url,
          timestamp,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`n8n webhook error: ${response.status} - ${errorText}`);

        return new Response(
          JSON.stringify({
            error: "Failed to fetch profile data from external service",
            upstream: {
              status: response.status,
              body: errorText,
              url: N8N_WEBHOOK_URL,
            },
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      data = await response.json();
      console.log(`Successfully received data from n8n for platform: ${platform}`);

      // Use proper storage path structure for n8n results too
      const fileId = crypto.randomUUID();
      storagePath = generateStoragePath(brandKitId, userId, platform, profileType, 'profile', fileId);
      storageBucket = "user-knowledge-files";

      console.log(`Uploading to storage path: ${storagePath}`);

      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(storagePath, JSON.stringify(data, null, 2), {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Storage upload error:`, uploadError);
      } else {
        console.log(`Successfully uploaded to storage: ${storagePath}`);
      }
    }

    return new Response(JSON.stringify({ profileData: data, storagePath, storageBucket, scrapeType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in social-profile-scrape function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
