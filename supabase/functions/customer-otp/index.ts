import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWhatsApp(phone: string, code: string): Promise<boolean> {
  const token = Deno.env.get("ULTRAMSG_TOKEN");
  const instance = Deno.env.get("ULTRAMSG_INSTANCE");
  if (!token || !instance) return false;

  // تحويل رقم العراقي 07XXXXXXXXX إلى الصيغة الدولية 9647XXXXXXXXX
  let intlPhone = phone.trim();
  if (intlPhone.startsWith("0")) {
    intlPhone = "964" + intlPhone.slice(1);
  }

  try {
    const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token,
        to: intlPhone,
        body: `🔐 رمز التحقق الخاص بك في متجرنا:\n\n*${code}*\n\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { phone } = body;

    if (!phone || !/^07[0-9]{9}$/.test(phone.trim())) {
      return new Response(
        JSON.stringify({ error: "رقم الهاتف غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = phone.trim();

    // إلغاء الرموز القديمة
    await supabase
      .from("customer_phone_otps")
      .update({ used: true })
      .eq("phone", normalizedPhone)
      .eq("used", false);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("customer_phone_otps").insert({
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء إنشاء الرمز" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sent = await sendWhatsApp(normalizedPhone, code);

    return new Response(
      JSON.stringify({ success: true, sent_via_whatsapp: sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("customer-otp error:", err);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
