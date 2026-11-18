import { NextResponse, after } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { getFunnel } from "@/lib/quiz/funnels";
import { answersToText, generatePlan, toTeaser, type Plan } from "@/lib/quiz/plan";
import { SubmissionSchema, cleanAnswers } from "@/lib/quiz/validate";
import { notifyOnce } from "@/lib/integrations/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generar el plan tarda entre 30 s y 2 min. El lead ve una pantalla de carga.
export const maxDuration = 300;

type Db = ReturnType<typeof serviceClient>;

/** Si la misma persona reenvía en menos de 15 min, devolvemos el plan ya hecho. */
const DEDUPE_MINUTES = 15;

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
    await db
      .from("leads")
      .update({
        full_name: existing.full_name ?? p.name,
        phone: existing.phone ?? p.phone,
        whatsapp_url: existing.phone ? undefined : whatsapp,
        instagram_handle: existing.instagram_handle ?? p.instagram ?? null,
        current_revenue: p.revenue ?? existing.current_revenue,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await db
    .from("leads")
    .insert({
      email: p.email,
      full_name: p.name,
      phone: p.phone,
      whatsapp_url: whatsapp,
      instagram_handle: p.instagram ?? null,
      current_revenue: p.revenue ?? null,
      source: p.source,
      status: "nuevo",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function POST(request: Request, ctx: { params: Promise<{ funnel: string }> }) {
  const { funnel: slug } = await ctx.params;
  const funnel = getFunnel(slug);
  if (!funnel) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = SubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Datos no válidos" }, { status: 400 });
  }
  const { contact, tracking, website } = parsed.data;

  // Bot: respondemos como si todo fuera bien y no gastamos nada.
  if (website) return NextResponse.json({ id: null, teaser: null });

  const { answers, missing } = cleanAnswers(funnel, parsed.data.answers);
  if (missing.length) {
    return NextResponse.json({ error: "Faltan respuestas del quiz" }, { status: 400 });
  }

  const db = serviceClient();
  const email = contact.email.toLowerCase();

  const since = new Date(Date.now() - DEDUPE_MINUTES * 60_000).toISOString();
  const { data: recent } = await db
    .from("quiz_submissions")
    .select("id, status, plan")
    .eq("funnel", funnel.slug)
    .ilike("email", email)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.status === "listo" && recent.plan) {
    return NextResponse.json({ id: recent.id, teaser: toTeaser(recent.plan as Plan) });
  }

  const revenueQ = funnel.questions.find((q) => q.id === "facturacion");
  const revenue =
    revenueQ?.type === "single"
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

  const { data: submission, error: insertError } = await db
    .from("quiz_submissions")
    .insert({
      funnel: funnel.slug,
      lead_id: leadId,
      full_name: contact.name,
      email,
      phone: contact.phone,
      instagram_handle: contact.instagram || null,
      answers,
      status: "generando",
      ...tracking,
    })
    .select("id")
    .single();
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

  const channel = funnel.slackChannel;
  if (channel && process.env.SLACK_BOT_TOKEN) {
    after(async () => {
      const appUrl = new URL(request.url).origin;
      await notifyOnce({
        kind: "quiz",
        entityId: submission.id,
        dedupeKey: `quiz:${submission.id}`,
        channel,
        text: `Nuevo lead del quiz: ${contact.name} (${revenue ?? "sin facturación"})`,
        blocks: [
          { type: "header", text: { type: "plain_text", text: "🧭 Nuevo lead del quiz", emoji: true } },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Lead*\n${contact.name}\n${email}` },
              { type: "mrkdwn", text: `*WhatsApp*\n<https://wa.me/${contact.phone.replace(/\D/g, "")}|${contact.phone}>` },
              { type: "mrkdwn", text: `*Facturación*\n${revenue ?? "—"}` },
              { type: "mrkdwn", text: `*Cuello de botella*\n${teaser?.cuello_de_botella.titulo ?? (failed ? "⚠️ el plan falló" : "—")}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: answersToText(funnel.questions, answers).slice(0, 2900) },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Ver plan en el CRM" },
                url: `${appUrl}/quiz/${submission.id}`,
              },
            ],
          },
        ],
      }).catch((err) => console.error("quiz: fallo al avisar en Slack", err));
    });
  }

  return NextResponse.json({ id: submission.id, teaser });
}
