import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookWhatsApp = Deno.env.get("WEBHOOK_URL_WHATSAPP");
    const webhookEmail = Deno.env.get("WEBHOOK_URL_EMAIL");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { documentType, patientName, patientPhone, patientEmail, pdfBase64, fileName } = body;

    if (!pdfBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "Missing pdfBase64 or fileName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 to Uint8Array
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const filePath = `documents/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-files")
      .upload(filePath, bytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("patient-files")
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const results: { channel: string; success: boolean; error?: string }[] = [];

    // Determine Caracas greeting
    const now = new Date();
    const caracasHour = parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", hour: "numeric", hour12: false }).format(now)
    );
    let greeting = "Hola, buenas noches";
    if (caracasHour >= 5 && caracasHour < 12) greeting = "Hola, buen día";
    else if (caracasHour >= 12 && caracasHour < 19) greeting = "Hola, buenas tardes";

    const docLabel = documentType === "recipe" ? "Recipe Médico" : "Presupuesto";

    // WhatsApp dispatch
    if (webhookWhatsApp && patientPhone) {
      try {
        const phone = patientPhone.replace(/^0/, "58").replace(/\D/g, "");
        const res = await fetch(webhookWhatsApp, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: "whatsapp",
            phone,
            patientName,
            message: `${greeting} ${patientName}, adjuntamos su ${docLabel} de Clínica Salud Oriente. ¡Feliz día!`,
            documentUrl: publicUrl,
            fileName,
            documentType,
          }),
        });
        results.push({ channel: "whatsapp", success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ channel: "whatsapp", success: false, error: msg });
      }
    }

    // Email dispatch
    if (webhookEmail && patientEmail) {
      try {
        const res = await fetch(webhookEmail, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: "email",
            email: patientEmail,
            patientName,
            subject: `${docLabel} — Clínica Salud Oriente`,
            message: `${greeting} ${patientName}, adjuntamos su ${docLabel}. ¡Feliz día!`,
            documentUrl: publicUrl,
            fileName,
            documentType,
          }),
        });
        results.push({ channel: "email", success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ channel: "email", success: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, publicUrl, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
