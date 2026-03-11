import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'missing_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the invitation by token
    const { data: invitation, error: invError } = await supabase
      .from('brand_kit_invitations')
      .select(`
        id,
        brand_kit_id,
        invited_by,
        role,
        email,
        expires_at,
        accepted_at
      `)
      .eq('token', token)
      .maybeSingle();

    if (invError) {
      console.error('[validate-invitation] DB error:', invError);
      return new Response(
        JSON.stringify({ valid: false, error: 'database_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ valid: false, error: 'not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'already_used' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch brand kit name
    const { data: brandKit } = await supabase
      .from('brand_kits')
      .select('name')
      .eq('id', invitation.brand_kit_id)
      .single();

    // Fetch inviter profile
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitation.invited_by)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A team member';

    return new Response(
      JSON.stringify({
        valid: true,
        invitation: {
          id: invitation.id,
          brandKitId: invitation.brand_kit_id,
          brandKitName: brandKit?.name || 'Unknown Brand Kit',
          inviterName,
          role: invitation.role,
          email: invitation.email,
          expiresAt: invitation.expires_at,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-invitation] Error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'server_error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
