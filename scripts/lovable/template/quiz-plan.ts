// Función de Supabase: guarda el lead, genera el plan con Claude y devuelve el adelanto.
// Secretos necesarios (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY.
// Opcional: SLACK_BOT_TOKEN para avisar de cada lead.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getFunnel } from "../_shared/funnels.ts";
import { answersToText, generatePlan, toTeaser, type Plan } from "../_shared/plan.ts";
import { SubmissionSchema, cleanAnswers } from "../_shared/validate.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** Si la misma persona reenvía en menos de 15 min, devolvemos el plan ya hecho. */
const DEDUPE_MINUTES = 15;

// Sin tipos generados de la base de datos: las tablas se tratan como genéricas.
// deno-lint-ignore no-explicit-any
type Db = SupabaseClient<any, any, any>;

async function upsertLead(
  db: Db,
  p: { email: string; name: string; phone: string; instagram?: string; revenue?: string; source: string },
) {
  const { data: existing } = await db
    .from("leads")
    .select("id, phone, instagram_handle, current_revenue, full_name")
    .ilike("email", p.email)
    .maybeSingle();
  const whatsapp = `https://wa.me/${p.phone.replace(/\D/g, "")}`;

  if (existing) {
    // Solo rellena huecos: no pisa lo que el equipo ya haya corregido a mano.
    await db.from("leads").update({
      full_name: existing.full_name ?? p.name,
      phone: existing.phone ?? p.phone,
      ...(existing.phone ? {} : { whatsapp_url: whatsapp }),
      instagram_handle: existing.instagram_handle ?? p.instagram ?? null,
      current_revenue: p.revenue ?? existing.current_revenue,
    }).eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await db.from("leads").insert({
    email: p.email,
    full_name: p.name,
    phone: p.phone,
    whatsapp_url: whatsapp,
    instagram_handle: p.instagram ?? null,
    current_revenue: p.revenue ?? null,
    source: p.source,
    status: "nuevo",
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function notifySlack(channel: string, text: string, blocks: unknown[]) {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) return;
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text, blocks }),
  });
  const body = await res.json();
  if (!body.ok) console.error("quiz: Slack", body.error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const body = await req.json().catch(() => null);
  const funnel = getFunnel(String(body?.funnel ?? ""));
  if (!funnel) return json({ error: "Quiz no encontrado" }, 404);

  const parsed = SubmissionSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Datos no válidos" }, 400);
  const { contact, tracking, website } = parsed.data;

  // Bot: respondemos como si todo fuera bien y no gastamos nada.
  if (website) return json({ id: null, teaser: null });

  const { answers, missing } = cleanAnswers(funnel, parsed.data.answers);
  if (missing.length) return json({ error: "Faltan respuestas del quiz" }, 400);

  const db: Db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const email = contact.email.toLowerCase();

  try {
    const since = new Date(Date.now() - DEDUPE_MINUTES * 60_000).toISOString();
    const { data: recent } = await db.from("quiz_submissions")
      .select("id, status, plan")
      .eq("funnel", funnel.slug).ilike("email", email).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recent?.status === "listo" && recent.plan) {
      return json({ id: recent.id, teaser: toTeaser(recent.plan as Plan) });
    }

    const revenueQ = funnel.questions.find((q) => q.id === "facturacion");
    const revenue = revenueQ?.type === "single"
      ? revenueQ.options.find((o) => o.value === answers.facturacion)?.label
      : undefined;

    const leadId = await upsertLead(db, {
      email,
      name: contact.name,
      phone: contact.phone,
      instagram: contact.instagram || undefined,
      revenue,
      source: tracking?.utm_source ? `quiz:${funnel.slug}:${tracking.utm_source}` : `quiz:${funnel.slug}`,
    });

    const { data: submission, error: insertError } = await db.from("quiz_submissions").insert({
      funnel: funnel.slug,
      lead_id: leadId,
      full_name: contact.name,
      email,
      phone: contact.phone,
      instagram_handle: contact.instagram || null,
      answers,
      status: "generando",
      ...tracking,
    }).select("id").single();
    if (insertError) throw insertError;

    let teaser = null;
    let failed: string | null = null;
    try {
      const { plan, model } = await generatePlan(funnel, { name: contact.name, answers });
      await db.from("quiz_submissions").update({ status: "listo", plan, model }).eq("id", submission.id);
      teaser = toTeaser(plan);
    } catch (err) {
      // El lead ya está guardado: aunque falle la IA, el equipo puede llamarle.
      failed = err instanceof Error ? err.message : String(err);
      console.error("quiz: fallo al generar el plan", submission.id, err);
      await db.from("quiz_submissions").update({ status: "error", error: failed }).eq("id", submission.id);
    }

    if (funnel.slackChannel) {
      const digits = contact.phone.replace(/\D/g, "");
      const slack = notifySlack(funnel.slackChannel, `Nuevo lead del quiz: ${contact.name} (${revenue ?? "sin facturación"})`, [
        { type: "header", text: { type: "plain_text", text: "🧭 Nuevo lead del quiz", emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Lead*\n${contact.name}\n${email}` },
            { type: "mrkdwn", text: `*WhatsApp*\n<https://wa.me/${digits}|${contact.phone}>` },
            { type: "mrkdwn", text: `*Facturación*\n${revenue ?? "—"}` },
            { type: "mrkdwn", text: `*Cuello de botella*\n${teaser?.cuello_de_botella.titulo ?? (failed ? "⚠️ el plan falló" : "—")}` },
          ],
        },
        { type: "section", text: { type: "mrkdwn", text: answersToText(funnel.questions, answers).slice(0, 2900) } },
      ]).catch((err) => console.error("quiz: Slack", err));
      // Se envía después de responder, sin hacer esperar al lead.
      // @ts-ignore EdgeRuntime existe en Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(slack);
      else await slack;
    }

    return json({ id: submission.id, teaser });
  } catch (err) {
    console.error("quiz: error", err);
    return json({ error: "No hemos podido guardar tus respuestas. Inténtalo de nuevo." }, 500);
  }
});
