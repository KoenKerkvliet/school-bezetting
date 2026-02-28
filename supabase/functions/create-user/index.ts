import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAILIT_API_URL = "https://api.emailit.com/v2/emails";
const FROM_EMAIL = "noreply@schoolbezetting.nl";
const FROM_NAME = "School Bezetting";

// ── CORS headers ──────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Invite email template ─────────────────────────────────────────────────

function inviteTemplate(firstName: string, resetUrl: string, schoolName: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color:#1e293b;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">School Bezetting</h1>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${schoolName}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Welkom${firstName ? ', ' + firstName : ''}!</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
              Er is een account voor je aangemaakt op <strong>${schoolName}</strong>.
              Klik op onderstaande knop om je wachtwoord in te stellen en direct aan de slag te gaan.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                  Wachtwoord instellen
                </a>
              </td></tr>
            </table>
            <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
              Als je deze uitnodiging niet verwachtte, kun je deze email negeren.
              <br>Deze link is 24 uur geldig.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} School Bezetting</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT — only authenticated users can create users
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;

    // Verify JWT with anon key
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, firstName, lastName, role, organizationId, schoolName } = await req.json();

    if (!email || !firstName || !lastName || !role || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, firstName, lastName, role, organizationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Create auth user
    const { data: authData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
    });

    if (createAuthError) {
      console.error("Error creating auth user:", createAuthError);
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${createAuthError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Create user record in database
    const { data: userData, error: createUserError } = await adminClient
      .from("users")
      .insert([
        {
          id: userId,
          organization_id: organizationId,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
        },
      ])
      .select();

    if (createUserError) {
      console.error("Error creating user record:", createUserError);
      // Try to delete the auth user since we couldn't create the user record
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Failed to create user record: ${createUserError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    const { error: createProfileError } = await adminClient
      .from("profiles")
      .insert([
        {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
        },
      ]);

    if (createProfileError) {
      console.error("Error creating profile:", createProfileError);
      // Profile creation failure is not critical, continue
    }

    // Send invite email directly via Emailit API
    const origin = req.headers.get("origin") || "https://schoolbezetting.nl";
    const resetUrl = `${origin}/set-password`;
    let emailSent = false;
    let emailError = "";

    const emailitApiKey = Deno.env.get("EMAILIT_API_KEY");
    if (emailitApiKey) {
      try {
        const subject = `Uitnodiging voor ${schoolName || "School Bezetting"}`;
        const html = inviteTemplate(firstName, resetUrl, schoolName || "School Bezetting");

        console.log("Sending email via Emailit to:", email);
        console.log("Using API key (first 10 chars):", emailitApiKey.substring(0, 10) + "...");

        const emailResponse = await fetch(EMAILIT_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${emailitApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject,
            html,
          }),
        });

        const emailResponseText = await emailResponse.text();
        console.log("Emailit response status:", emailResponse.status);
        console.log("Emailit response body:", emailResponseText);

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          emailError = `Emailit ${emailResponse.status}: ${emailResponseText}`;
        }
      } catch (emailErr) {
        emailError = `Emailit fetch error: ${emailErr.message}`;
        console.error(emailError);
      }
    } else {
      emailError = "EMAILIT_API_KEY not configured";
      console.warn(emailError);
    }

    // Log to audit
    try {
      await adminClient.from("audit_logs").insert([
        {
          organization_id: organizationId,
          user_id: user.id,
          action: "CREATE_USER",
          resource_type: "user",
          resource_id: userId,
          changes: {
            email,
            firstName,
            lastName,
            role,
            emailSent,
          },
        },
      ]);
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return new Response(
      JSON.stringify({ success: true, user: userData[0], emailSent, emailError: emailError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
