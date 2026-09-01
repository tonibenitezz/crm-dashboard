import crypto from "node:crypto";

/**
 * Verifica la cabecera `Calendly-Webhook-Signature`, con formato
 * `t=<unix>,v1=<hmac>` donde el HMAC-SHA256 es sobre `${t}.${body}`.
 * Comparación en tiempo constante y ventana de tolerancia para
 * descartar reenvíos antiguos.
 */
export function verifyCalendlySignature(
  rawBody: string,
  header: string | null,
  signingKey: string,
  toleranceSeconds = 300,
): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1) return false;

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts.v1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type CalendlyQA = { question: string; answer: string; position: number };

export type CalendlyInviteePayload = {
  uri: string;
  email: string;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  timezone?: string;
  status?: string;
  rescheduled?: boolean;
  cancellation?: { canceled_by?: string; reason?: string } | null;
  questions_and_answers?: CalendlyQA[];
  tracking?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  } | null;
  scheduled_event: {
    uri: string;
    name?: string;
    start_time: string;
    end_time?: string;
    status?: string;
    event_memberships?: { user?: string; user_email?: string; user_name?: string }[];
  };
};

export type CalendlyWebhook = {
  event: "invitee.created" | "invitee.canceled" | string;
  created_at: string;
  payload: CalendlyInviteePayload;
};

/** Convierte las preguntas del formulario de Calendly en un objeto plano. */
export function answersToObject(qa: CalendlyQA[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of qa) {
    if (item?.question) out[item.question] = item.answer ?? "";
  }
  return out;
}

/**
 * El setter puede venir por UTM (enlace personalizado por setter) o por una
 * pregunta del formulario. Se prueban las dos fuentes, en ese orden.
 */
export function extractSetterHint(p: CalendlyInviteePayload): string | null {
  const utm = p.tracking?.utm_source ?? p.tracking?.utm_content ?? null;
  if (utm) return utm.trim().toLowerCase();

  const answers = answersToObject(p.questions_and_answers);
  for (const [question, answer] of Object.entries(answers)) {
    if (/setter|qui[eé]n te|contact[oó]|te escribi[oó]/i.test(question) && answer) {
      return answer.trim().toLowerCase();
    }
  }
  return null;
}
