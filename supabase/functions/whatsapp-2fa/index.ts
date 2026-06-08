import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailCode(to: string, code: string, supabaseUrl: string, serviceRoleKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    // Use Supabase's built-in email via the resend integration or SMTP
    // We'll use fetch to call the Supabase email endpoint
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-otp-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ to, code }),
    });

    return emailRes.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.app_metadata?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Not an admin user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, code: submittedCode } = body;

    if (action === "send") {
      const verificationCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Invalidate any existing codes for this user
      await supabase
        .from("admin_verification_codes")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      // Store the new code
      const { error: insertError } = await supabase
        .from("admin_verification_codes")
        .insert({
          user_id: user.id,
          code: verificationCode,
          whatsapp_number: user.email || '',
          expires_at: expiresAt,
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to store verification code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to send via UltraMsg WhatsApp API if configured
      const ultraMsgToken = Deno.env.get("ULTRAMSG_TOKEN");
      const ultraMsgInstance = Deno.env.get("ULTRAMSG_INSTANCE");
      const adminPhone = Deno.env.get("ADMIN_WHATSAPP_NUMBER") || body.phone;

      let sent = false;

      if (ultraMsgToken && ultraMsgInstance && adminPhone) {
        try {
          const msgRes = await fetch(`https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: ultraMsgToken,
              to: adminPhone,
              body: `رمز التحقق لمتجر سحاب: *${verificationCode}*\n\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
            }),
          });
          sent = msgRes.ok;
        } catch {
          sent = false;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          sent_via_whatsapp: sent,
          // Always return the code so admin can see it on screen if WhatsApp not configured
          code: verificationCode,
          expires_at: expiresAt,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!submittedCode) {
        return new Response(
          JSON.stringify({ error: "Verification code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: records, error: fetchError } = await supabase
        .from("admin_verification_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", submittedCode)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError || !records || records.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("admin_verification_codes")
        .update({ used: true })
        .eq("id", records[0].id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("2FA error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
