import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAILIT_API_URL = "https://api.emailit.com/v2/emails";
const FROM_EMAIL = "noreply@designpixels.nl";
const FROM_NAME = "School Bezetting";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function testTemplate(name: string, message: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:#1e293b;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">School Bezetting</h1>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Test Email</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Hallo${name ? ', ' + name : ''}!</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
              ${message.replace(/\n/g, '<br>')}
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
              Dit is een test email verstuurd via School Bezetting.
            </p>
          </td>
        </tr>
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { to, name, message } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Vul alle verplichte velden in (email en bericht)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Emailit
    const emailitApiKey = Deno.env.get("EMAILIT_API_KEY");
    if (!emailitApiKey) {
      return new Response(
        JSON.stringify({ error: "EMAILIT_API_KEY is niet geconfigureerd op de server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending test email to:", to);
    console.log("API key (first 10):", emailitApiKey.substring(0, 10) + "...");

    const html = testTemplate(name || "", message);

    const emailResponse = await fetch(EMAILIT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailitApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: "Test Email — School Bezetting",
        html,
      }),
    });

    const responseText = await emailResponse.text();
    console.log("Emailit status:", emailResponse.status);
    console.log("Emailit response:", responseText);

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Emailit fout (${emailResponse.status}): ${responseText}`,
          status: emailResponse.status,
          details: responseText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return new Response(
      JSON.stringify({ success: true, emailId: responseData.id, details: responseData }),
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
