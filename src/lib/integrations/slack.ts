import { serviceClient } from "@/lib/supabase/server";

type Block = Record<string, unknown>;

export type SlackMessage = {
  channel: string;
  text: string; // fallback para notificaciones móviles
  blocks?: Block[];
};

/**
 * Envía a Slack con el bot token (chat.postMessage) para poder usar
 * bloques ricos y varios canales con una sola credencial.
 */
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
 * Envía una sola vez por dedupeKey. Si el webhook de Calendly se
 * reintenta, el equipo no recibe el mismo aviso dos veces.
 */
export async function notifyOnce(
  opts: SlackMessage & { kind: string; entityId?: string; dedupeKey: string },
) {
  const db = serviceClient();
  const { error: claimError } = await db
    .from("notification_log")
    .insert({
      channel: opts.channel,
      kind: opts.kind,
      entity_id: opts.entityId ?? null,
      dedupe_key: opts.dedupeKey,
    });

  // 23505 = unique_violation: ya se envió, no repetimos.
  if (claimError) {
    if (claimError.code === "23505") return { skipped: true as const };
    throw claimError;
  }

  try {
    await postToSlack({ channel: opts.channel, text: opts.text, blocks: opts.blocks });
    return { skipped: false as const };
  } catch (err) {
    await db
      .from("notification_log")
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

export function fmtMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

export function fmtDateTime(iso: string, timeZone = "Europe/Madrid") {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}
