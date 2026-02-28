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
    // Verify JWT — only authenticated users can delete users
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
    const { userId, organizationId } = await req.json();

    if (!userId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, organizationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if user being deleted is an Admin — prevent deleting the last Admin
    const { data: targetUser } = await adminClient
      .from("users")
      .select("role")
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (targetUser?.role === "Admin") {
      const { count } = await adminClient
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("role", "Admin");

      if (count !== null && count <= 1) {
        return new Response(
          JSON.stringify({ error: "Kan de laatste admin niet verwijderen" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Delete from users table (cascade will remove profiles)
    const { error: deleteUserError } = await adminClient
      .from("users")
      .delete()
      .eq("id", userId)
      .eq("organization_id", organizationId);

    if (deleteUserError) {
      console.error("Error deleting user record:", deleteUserError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user record: ${deleteUserError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete from Supabase Auth
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      // User record is already deleted, log but don't fail
    }

    // Log to audit
    try {
      await adminClient.from("audit_logs").insert([
        {
          organization_id: organizationId,
          user_id: user.id,
          action: "DELETE_USER",
          resource_type: "user",
          resource_id: userId,
          changes: { deleted: true },
        },
      ]);
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return new Response(
      JSON.stringify({ success: true }),
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
