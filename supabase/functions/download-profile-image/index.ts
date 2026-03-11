import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { validateJWT, verifyBrandKitAccess } from "../_shared/auth.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(origin);
  }

  try {
    const { imageUrl, brandKitId, platform, profileType } = await req.json();

    console.log('[download-profile-image] Starting download:', { imageUrl, brandKitId, platform, profileType });

    if (!imageUrl) {
      console.log('[download-profile-image] No image URL provided');
      return new Response(
        JSON.stringify({ error: 'No image URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!brandKitId || !platform || !profileType) {
      console.log('[download-profile-image] Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: brandKitId, platform, profileType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user and ownership
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authResult = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);
    if (!authResult.valid || !authResult.user) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = authResult.user;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { isOwner, isMember } = await verifyBrandKitAccess(supabase, brandKitId, user.id);
    if (!isOwner && !isMember) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to brand kit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the image from the external URL
    console.log('[download-profile-image] Fetching image from:', imageUrl);
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': imageUrl.includes('instagram') ? 'https://www.instagram.com/' :
          imageUrl.includes('facebook') ? 'https://www.facebook.com/' :
            imageUrl.includes('linkedin') ? 'https://www.linkedin.com/' : '',
      },
    });

    if (!imageResponse.ok) {
      console.error('[download-profile-image] Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${imageResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the image content type and data
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    console.log('[download-profile-image] Downloaded image, size:', imageBuffer.byteLength, 'type:', contentType);

    // Determine file extension from content type
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';

    // Create a unique filename
    const timestamp = Date.now();
    const storagePath = `${brandKitId}/${platform}/${profileType}_${timestamp}.${extension}`;

    console.log('[download-profile-image] Uploading to storage:', storagePath);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('social-profile-images')
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[download-profile-image] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload image: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('social-profile-images')
      .getPublicUrl(storagePath);

    const permanentUrl = publicUrlData.publicUrl;

    console.log('[download-profile-image] Successfully uploaded, permanent URL:', permanentUrl);

    return new Response(
      JSON.stringify({
        success: true,
        permanentUrl,
        storagePath,
        originalUrl: imageUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[download-profile-image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
