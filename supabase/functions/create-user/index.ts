import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS headers ──────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    // Send invite email via Edge Function
    const resetUrl = `${req.headers.get("origin")}/set-password`;
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "invite",
          to: email,
          data: {
            firstName,
            resetUrl,
            schoolName: schoolName || "School Bezetting",
          },
        }),
      });
    } catch (emailErr) {
      // If Edge Function fails, fall back to Supabase's built-in email
      console.warn("send-email function failed, falling back to Supabase:", emailErr.message);
      try {
        await adminClient.auth.admin.generateLink({
          type: "signup",
          email,
          options: {
            redirectTo: resetUrl,
          },
        });
      } catch (resetErr) {
        console.error("Fallback email also failed:", resetErr);
        // Still return success since user was created, just email failed
      }
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
          },
        },
      ]);
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
      // Don't fail if audit fails
    }

    return new Response(
      JSON.stringify({ success: true, user: userData[0] }),
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
