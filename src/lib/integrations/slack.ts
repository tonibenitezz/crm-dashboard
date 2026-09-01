import { serviceClient } from "@/lib/supabase/server";
import { fmtDateTime, fmtMoney } from "@/lib/format";

type Block = Record<string, unknown>;

export type SlackMessage = {
  channel: string;
  text: string; // fallback para la notificación del móvil
  blocks?: Block[];
};

async function postToSlack(msg: SlackMessage) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("Falta SLACK_BOT_TOKEN");

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(msg),
  });
  const body = (await res.json()) as { ok: boolean; error?: string };
  if (!body.ok) throw new Error(`Slack: ${body.error ?? "error desconocido"}`);
}

/**
 * Envía una sola vez por `dedupeKey`. El log actúa de cerrojo: si Calendly
 * reintenta el webhook, el equipo no recibe el aviso dos veces.
 */
export async function notifyOnce(
  opts: SlackMessage & { kind: string; entityId?: string; dedupeKey: string },
) {
  const db = serviceClient();
  const { error: claimError } = await db.from("notification_log").insert({
    channel: opts.channel,
    kind: opts.kind,
    entity_id: opts.entityId ?? null,
    dedupe_key: opts.dedupeKey,
  });

  // 23505 = unique_violation: ya se envió.
  if (claimError) {
    if (claimError.code === "23505") return { skipped: true as const };
    throw claimError;
  }

  try {
    await postToSlack({ channel: opts.channel, text: opts.text, blocks: opts.blocks });
    return { skipped: false as const };
  } catch (err) {
    await db.from("notification_log")
      .update({ ok: false, error: String(err) })
      .eq("dedupe_key", opts.dedupeKey);
    throw err;
  }
}

export const CHANNELS = {
  agendas: process.env.SLACK_CHANNEL_AGENDAS ?? "#agendas",
  cierres: process.env.SLACK_CHANNEL_CIERRES ?? "#cierres",
  alertas: process.env.SLACK_CHANNEL_ALERTAS ?? "#alertas",
};

/** Menciona en Slack si hay ID, y si no cae al nombre. */
export function mention(m: { full_name: string; slack_user_id?: string | null } | null) {
  if (!m) return "sin asignar";
  return m.slack_user_id ? `<@${m.slack_user_id}>` : m.full_name;
}

export async function notifyNewDeal(deal: {
  id: string;
  dealName: string;
  ticket: number;
  currency: string;
  cashNow: number;
  program: string | null;
  paymentMethod: string | null;
  closer: { full_name: string; slack_user_id?: string | null } | null;
  setter: { full_name: string; slack_user_id?: string | null } | null;
  monthCash: number;
}) {
  await notifyOnce({
    kind: "cierre",
    entityId: deal.id,
    dedupeKey: `cierre:${deal.id}`,
    channel: CHANNELS.cierres,
    text: `Nuevo cierre: ${deal.dealName} — ${fmtMoney(deal.ticket, deal.currency)}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "💵 Nuevo cierre", emoji: true } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Cliente*\n${deal.dealName}` },
          { type: "mrkdwn", text: `*Ticket*\n${fmtMoney(deal.ticket, deal.currency)}` },
          { type: "mrkdwn", text: `*Cobrado ahora*\n${fmtMoney(deal.cashNow, deal.currency)}` },
          { type: "mrkdwn", text: `*Programa*\n${deal.program ?? "—"}` },
          { type: "mrkdwn", text: `*Closer*\n${mention(deal.closer)}` },
          { type: "mrkdwn", text: `*Setter*\n${mention(deal.setter)}` },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${deal.paymentMethod ?? "—"} · cash collected del mes: *${fmtMoney(deal.monthCash, deal.currency)}*`,
          },
        ],
      },
    ],
  });
}

export { fmtMoney, fmtDateTime };
