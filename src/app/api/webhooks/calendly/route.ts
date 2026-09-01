import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import {
  answersToObject,
  extractSetterHint,
  verifyCalendlySignature,
  type CalendlyInviteePayload,
  type CalendlyWebhook,
} from "@/lib/integrations/calendly";
import { CHANNELS, fmtDateTime, notifyOnce } from "@/lib/integrations/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Db = ReturnType<typeof serviceClient>;

/** Busca al closer por la URI de Calendly del anfitrión de la llamada. */
async function resolveCloser(db: Db, p: CalendlyInviteePayload) {
  const hostUri = p.scheduled_event.event_memberships?.[0]?.user;
  if (!hostUri) return null;
  const { data } = await db
    .from("team_members")
    .select("id, full_name, slack_user_id")
    .eq("calendly_user_uri", hostUri)
    .maybeSingle();
  return data;
}

/** Busca al setter por el hint (UTM o respuesta del formulario). */
async function resolveSetter(db: Db, hint: string | null) {
  if (!hint) return null;
  const { data } = await db
    .from("team_members")
    .select("id, full_name, slack_user_id")
    .eq("role", "setter")
    .or(`email.ilike.${hint},full_name.ilike.%${hint}%,instagram_handle.ilike.${hint}`)
    .limit(1)
    .maybeSingle();
  return data;
}

/** Crea el lead o recupera el existente por email. */
async function upsertLead(db: Db, p: CalendlyInviteePayload, setterId: string | null) {
  const email = p.email?.toLowerCase();
  if (!email) return null;

  const { data: existing } = await db
    .from("leads")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    await db
      .from("leads")
      .update({ status: "agendado", ...(setterId ? { setter_id: setterId } : {}) })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await db
    .from("leads")
    .insert({
      email,
      full_name: p.name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || null),
      source: p.tracking?.utm_source ?? "calendly",
      setter_id: setterId,
      status: "agendado",
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}

async function handleCreated(db: Db, p: CalendlyInviteePayload) {
  const closer = await resolveCloser(db, p);
  const setter = await resolveSetter(db, extractSetterHint(p));
  const leadId = await upsertLead(db, p, setter?.id ?? null);

  const { data: booking, error } = await db
    .from("bookings")
    .upsert(
      {
        lead_id: leadId,
        closer_id: closer?.id ?? null,
        setter_id: setter?.id ?? null,
        calendly_event_uri: p.scheduled_event.uri,
        calendly_invitee_uri: p.uri,
        event_type_name: p.scheduled_event.name ?? null,
        scheduled_at: p.scheduled_event.start_time,
        timezone: p.timezone ?? null,
        status: "agendada",
        utm_source: p.tracking?.utm_source ?? null,
        utm_medium: p.tracking?.utm_medium ?? null,
        utm_campaign: p.tracking?.utm_campaign ?? null,
        utm_content: p.tracking?.utm_content ?? null,
        utm_term: p.tracking?.utm_term ?? null,
        invitee_name: p.name ?? null,
        invitee_email: p.email ?? null,
        answers: answersToObject(p.questions_and_answers),
        raw_payload: p as unknown as Record<string, unknown>,
      },
      { onConflict: "calendly_invitee_uri" },
    )
    .select("id")
    .single();

  if (error) throw error;

  const answers = answersToObject(p.questions_and_answers);
  const answerLines = Object.entries(answers)
    .slice(0, 6)
    .map(([q, a]) => `*${q}*\n${a || "—"}`)
    .join("\n");

  await notifyOnce({
    kind: "agenda",
    entityId: booking.id,
    dedupeKey: `agenda:${p.uri}`,
    channel: CHANNELS.agendas,
    text: `Nueva agenda: ${p.name ?? p.email} — ${fmtDateTime(p.scheduled_event.start_time)}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📅 Nueva agenda", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Lead*\n${p.name ?? "—"}\n${p.email ?? "—"}` },
          { type: "mrkdwn", text: `*Cuándo*\n${fmtDateTime(p.scheduled_event.start_time)}` },
          {
            type: "mrkdwn",
            text: `*Closer*\n${closer ? `<@${closer.slack_user_id ?? ""}> ${closer.full_name}` : "sin asignar"}`,
          },
          {
            type: "mrkdwn",
            text: `*Setter*\n${setter ? `<@${setter.slack_user_id ?? ""}> ${setter.full_name}` : "sin atribuir"}`,
          },
        ],
      },
      ...(answerLines
        ? [{ type: "section", text: { type: "mrkdwn", text: answerLines.slice(0, 2900) } }]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${p.scheduled_event.name ?? "Llamada"} · origen: ${p.tracking?.utm_source ?? "directo"}`,
          },
        ],
      },
    ],
  });
}

async function handleCanceled(db: Db, p: CalendlyInviteePayload) {
  await db
    .from("bookings")
    .update({
      status: p.rescheduled ? "reagendada" : "cancelada",
      cancel_reason: p.cancellation?.reason ?? null,
      canceled_at: new Date().toISOString(),
    })
    .eq("calendly_invitee_uri", p.uri);

  await notifyOnce({
    kind: "cancelacion",
    dedupeKey: `cancel:${p.uri}`,
    channel: CHANNELS.agendas,
    text: `Agenda cancelada: ${p.name ?? p.email}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `❌ *Agenda cancelada* — ${p.name ?? p.email}\n${fmtDateTime(
            p.scheduled_event.start_time,
          )}${p.cancellation?.reason ? `\nMotivo: ${p.cancellation.reason}` : ""}`,
        },
      },
    ],
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

  if (!signingKey) {
    return NextResponse.json({ error: "webhook no configurado" }, { status: 500 });
  }
  if (!verifyCalendlySignature(raw, req.headers.get("calendly-webhook-signature"), signingKey)) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const body = JSON.parse(raw) as CalendlyWebhook;
  const db = serviceClient();

  try {
    if (body.event === "invitee.created") await handleCreated(db, body.payload);
    else if (body.event === "invitee.canceled") await handleCanceled(db, body.payload);
    else return NextResponse.json({ ignored: body.event });
  } catch (err) {
    // 500 hace que Calendly reintente; notifyOnce evita el aviso duplicado.
    console.error("[calendly]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
