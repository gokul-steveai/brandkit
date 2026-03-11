import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { COLLABORATION_LIMITS, canAddCollaborator, type SubscriptionTier, type CollaborationRole } from "../_shared/plan-limits.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'method_not_allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the user from the auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use anon key with user's token to validate
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the invitation
    const { data: invitation, error: invError } = await supabase
      .from('brand_kit_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: 'invitation_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validate invitation
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'already_used' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('brand_kit_members')
      .select('id')
      .eq('brand_kit_id', invitation.brand_kit_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      // Mark invitation as accepted even if already a member
      await supabase
        .from('brand_kit_invitations')
        .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          brandKitId: invitation.brand_kit_id,
          message: 'already_member'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === PHASE 5: Server-side limit enforcement ===
    
    // Step 1: Get brand kit owner
    const { data: brandKit, error: brandKitError } = await supabase
      .from('brand_kits')
      .select('user_id')
      .eq('id', invitation.brand_kit_id)
      .single();

    if (brandKitError || !brandKit) {
      console.error('[accept-invitation] Brand kit not found:', brandKitError);
      return new Response(
        JSON.stringify({ success: false, error: 'brand_kit_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Step 2: Get owner's subscription tier
    const { data: ownerSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('subscription_tier')
      .eq('user_id', brandKit.user_id)
      .maybeSingle();

    // Default to 'free' if no subscription found
    const ownerTier: SubscriptionTier = (ownerSub?.subscription_tier as SubscriptionTier) || 'free';

    // Step 3: Count existing members of this role
    const { count: roleCount, error: countError } = await supabase
      .from('brand_kit_members')
      .select('id', { count: 'exact', head: true })
      .eq('brand_kit_id', invitation.brand_kit_id)
      .eq('role', invitation.role);

    if (countError) {
      console.error('[accept-invitation] Error counting members:', countError);
      return new Response(
        JSON.stringify({ success: false, error: 'failed_to_check_limits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 4: Check if adding this member would exceed limits
    const currentCount = roleCount || 0;
    const invitationRole = invitation.role as CollaborationRole;
    
    if (!canAddCollaborator(ownerTier, invitationRole, currentCount)) {
      console.log(`[accept-invitation] Limit exceeded: tier=${ownerTier}, role=${invitationRole}, count=${currentCount}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'limit_exceeded',
          message: `The ${invitationRole} limit has been reached for this brand kit's plan. Contact the owner to upgrade.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // === End limit enforcement ===

    // Add user to brand kit members
    const { error: memberError } = await supabase
      .from('brand_kit_members')
      .insert({
        brand_kit_id: invitation.brand_kit_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by
      });

    if (memberError) {
      console.error('[accept-invitation] Error adding member:', memberError);
      return new Response(
        JSON.stringify({ success: false, error: 'failed_to_add_member' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from('brand_kit_invitations')
      .update({ 
        accepted_at: new Date().toISOString(), 
        accepted_by: user.id 
      })
      .eq('id', invitation.id);

    // Log to audit_logs for security monitoring
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'invitation_accepted',
      resource_type: 'brand_kit_invitation',
      resource_id: invitation.id,
      status: 'success',
      details: {
        brand_kit_id: invitation.brand_kit_id,
        token_used: token.substring(0, 8) + '...', // Partial for security
        role_granted: invitation.role,
        invited_by: invitation.invited_by,
        owner_tier: ownerTier,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        brandKitId: invitation.brand_kit_id,
        role: invitation.role
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[accept-invitation] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'server_error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
