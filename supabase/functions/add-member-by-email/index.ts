import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { validateJWT, verifyBrandKitAccess, isValidUUID, sanitizeString } from "../_shared/auth.ts";
import { canAddCollaborator, type SubscriptionTier, type CollaborationRole } from "../_shared/plan-limits.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

interface LookupRequest {
  action: "lookup";
  brand_kit_id: string;
  email: string;
}

interface AddRequest {
  action: "add";
  brand_kit_id: string;
  email: string;
  role: CollaborationRole;
}

interface InviteRequest {
  action: "invite";
  brand_kit_id: string;
  email: string;
  role: CollaborationRole;
  first_name: string;
  last_name: string;
}

type RequestBody = LookupRequest | AddRequest | InviteRequest;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPrelight(origin);
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    const authResult = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);
    if (!authResult.valid || !authResult.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.user.id;
    const body: RequestBody = await req.json();
    const { action, brand_kit_id } = body;

    // Validate brand_kit_id
    if (!isValidUUID(brand_kit_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid brand kit ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for all DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is owner or admin of the brand kit
    const access = await verifyBrandKitAccess(supabase, brand_kit_id, userId);
    if (!access.isOwner && access.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only owners and admins can manage members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize email
    const email = sanitizeString(body.email, 320)?.toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: LOOKUP =====
    if (action === "lookup") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .eq("email", email)
        .maybeSingle();

      if (profile) {
        // Check if already a member
        const { data: existing } = await supabase
          .from("brand_kit_members")
          .select("id")
          .eq("brand_kit_id", brand_kit_id)
          .eq("user_id", profile.id)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ status: "already_member" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            status: "found",
            user: {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              email: profile.email,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: "not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: ADD =====
    if (action === "add") {
      const role = body.role;
      if (!["viewer", "editor", "admin"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the user to add
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check plan limits
      const limitCheck = await checkPlanLimits(supabase, brand_kit_id, role);
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({ error: limitCheck.message }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("brand_kit_members")
        .select("id")
        .eq("brand_kit_id", brand_kit_id)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "User is already a member of this brand kit" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add the member
      const { error: insertError } = await supabase
        .from("brand_kit_members")
        .insert({
          brand_kit_id,
          user_id: profile.id,
          role,
          invited_by: userId,
        });

      if (insertError) {
        console.error("[add-member-by-email] Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to add member" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "member_added_by_email",
        resource_type: "brand_kit_member",
        resource_id: brand_kit_id,
        status: "success",
        details: {
          added_user_id: profile.id,
          role,
          method: "email_lookup",
        },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: INVITE =====
    if (action === "invite") {
      const role = body.role;
      const firstName = sanitizeString(body.first_name, 100);
      const lastName = sanitizeString(body.last_name, 100);

      if (!["viewer", "editor", "admin"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!firstName) {
        return new Response(
          JSON.stringify({ error: "First name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check plan limits
      const limitCheck = await checkPlanLimits(supabase, brand_kit_id, role);
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({ error: limitCheck.message }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a secure token
      const token = crypto.randomUUID();

      // Create the invitation record
      const { error: invError } = await supabase
        .from("brand_kit_invitations")
        .insert({
          brand_kit_id,
          invited_by: userId,
          role,
          token,
          email,
        });

      if (invError) {
        console.error("[add-member-by-email] Invitation insert error:", invError);
        return new Response(
          JSON.stringify({ error: "Failed to create invitation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get admin name and brand kit name for the email
      const [adminProfile, brandKit] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
        supabase.from("brand_kits").select("name").eq("id", brand_kit_id).single(),
      ]);

      const adminName = adminProfile.data?.full_name || "A team member";
      const brandKitName = brandKit.data?.name || "a brand kit";
      const inviteeName = [firstName, lastName].filter(Boolean).join(" ");

      // Build the signup URL with the invite token
      const signupUrl = `https://brandkit-os.lovable.app/signup?invite=${token}`;

      // Send the email via SendGrid
      if (SENDGRID_API_KEY) {
        const emailHtml = buildInvitationEmail({
          inviteeName,
          adminName,
          brandKitName,
          role,
          signupUrl,
        });

        const sendgridPayload = {
          personalizations: [{ to: [{ email, name: inviteeName }] }],
          from: { email: "noreply@brandkitos.com", name: "Brand Kit OS" },
          subject: `${adminName} invited you to collaborate on "${brandKitName}"`,
          content: [{ type: "text/html", value: emailHtml }],
          categories: ["invitation"],
        };

        try {
          const emailResponse = await fetch(SENDGRID_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(sendgridPayload),
          });

          if (!emailResponse.ok) {
            console.error("[add-member-by-email] SendGrid error:", await emailResponse.text());
            // Don't fail the whole request -- invitation was created
          }
        } catch (emailErr) {
          console.error("[add-member-by-email] Email send error:", emailErr);
        }
      } else {
        console.warn("[add-member-by-email] SENDGRID_API_KEY not configured, skipping email");
      }

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "email_invitation_sent",
        resource_type: "brand_kit_invitation",
        resource_id: brand_kit_id,
        status: "success",
        details: {
          invited_email: email,
          role,
          invitee_name: inviteeName,
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Invitation sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[add-member-by-email] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== HELPERS =====

async function checkPlanLimits(
  supabase: ReturnType<typeof createClient>,
  brandKitId: string,
  role: string
): Promise<{ allowed: boolean; message?: string }> {
  // Get brand kit owner
  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("user_id")
    .eq("id", brandKitId)
    .single();

  if (!brandKit) return { allowed: false, message: "Brand kit not found" };

  // Get owner's subscription tier
  const { data: ownerSub } = await supabase
    .from("user_subscriptions")
    .select("subscription_tier")
    .eq("user_id", brandKit.user_id)
    .maybeSingle();

  const ownerTier: SubscriptionTier = (ownerSub?.subscription_tier as SubscriptionTier) || "free";

  // Count existing members of this role
  const { count } = await supabase
    .from("brand_kit_members")
    .select("id", { count: "exact", head: true })
    .eq("brand_kit_id", brandKitId)
    .eq("role", role);

  const currentCount = count || 0;

  if (!canAddCollaborator(ownerTier, role as CollaborationRole, currentCount)) {
    return {
      allowed: false,
      message: `The ${role} limit has been reached for this plan. Upgrade to add more.`,
    };
  }

  return { allowed: true };
}

function buildInvitationEmail(params: {
  inviteeName: string;
  adminName: string;
  brandKitName: string;
  role: string;
  signupUrl: string;
}): string {
  const { inviteeName, adminName, brandKitName, role, signupUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #e4e4e7;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#18181b;">You're Invited!</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
                Hi ${inviteeName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
                <strong>${adminName}</strong> has invited you to collaborate on
                <strong>"${brandKitName}"</strong> as a <strong>${role}</strong> on Brand Kit OS.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                Click the button below to create your account and get started:
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Brand Kit OS &mdash; AI-Powered Brand Identity Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
