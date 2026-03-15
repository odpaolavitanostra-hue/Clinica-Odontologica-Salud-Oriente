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

    const now = new Date().toISOString();
    const { data: pending, error: fetchErr } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending notifications" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const notif of pending) {
      const hasAnyWebhook = webhookWhatsApp || webhookEmail;

      if (!hasAnyWebhook) {
        await supabase.from("scheduled_notifications").update({ status: "no_webhook" }).eq("id", notif.id);
        skipped++;
        continue;
      }

      try {
        const payload = {
          id: notif.id,
          type: notif.type,
          patient_name: notif.patient_name,
          phone: notif.phone,
          message: notif.message,
          appointment_id: notif.appointment_id,
          lead_id: notif.lead_id,
          scheduled_for: notif.scheduled_for,
          channel: "all",
        };

        const promises: Promise<Response>[] = [];

        // Send to WhatsApp webhook
        if (webhookWhatsApp) {
          promises.push(
            fetch(webhookWhatsApp, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, channel: "whatsapp" }),
            })
          );
        }

        // Send to Email webhook
        if (webhookEmail) {
          // Look up patient email from appointments table
          let patientEmail = "";
          if (notif.appointment_id) {
            const { data: appt } = await supabase
              .from("appointments")
              .select("patient_email")
              .eq("id", notif.appointment_id)
              .single();
            patientEmail = appt?.patient_email || "";
          }

          promises.push(
            fetch(webhookEmail, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, channel: "email", email: patientEmail }),
            })
          );
        }

        const results = await Promise.allSettled(promises);
        const allOk = results.every(
          (r) => r.status === "fulfilled" && r.value.ok
        );

        if (allOk) {
          await supabase.from("scheduled_notifications").update({
            status: "sent",
            sent_at: new Date().toISOString(),
          }).eq("id", notif.id);
          sent++;
        } else {
          const errors = results
            .filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok))
            .map((r) => r.status === "rejected" ? r.reason : "HTTP error");
          console.error(`Webhook errors for ${notif.id}:`, errors);
          await supabase.from("scheduled_notifications").update({ status: "failed" }).eq("id", notif.id);
        }
      } catch (err) {
        await supabase.from("scheduled_notifications").update({ status: "failed" }).eq("id", notif.id);
        console.error(`Error sending ${notif.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ processed: pending.length, sent, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
