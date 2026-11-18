import { z } from "zod";
import type { Answers } from "./plan";
import type { FunnelConfig } from "./types";

const MAX_TEXT = 1500;

export const SubmissionSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  contact: z.object({
    name: z.string().trim().min(2, "Pon tu nombre").max(120),
    email: z.email("Revisa el email").max(200),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[^\d+]/g, ""))
      .pipe(z.string().regex(/^\+?\d{8,15}$/, "Pon tu WhatsApp con prefijo, p. ej. +34 600 000 000")),
    instagram: z
      .string()
      .trim()
      .max(60)
      .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""))
      .optional(),
  }),
  tracking: z
    .object({
      utm_source: z.string().max(200).optional(),
      utm_medium: z.string().max(200).optional(),
      utm_campaign: z.string().max(200).optional(),
      utm_content: z.string().max(200).optional(),
      utm_term: z.string().max(200).optional(),
      referrer: z.string().max(500).optional(),
    })
    .optional(),
  /** Campo trampa: invisible para personas, los bots lo rellenan. */
  website: z.string().optional(),
});

export type Submission = z.infer<typeof SubmissionSchema>;

/**
 * Valida las respuestas contra las preguntas del funnel y se queda solo con
 * lo que corresponde a cada una: values que existen, textos acotados y
 * cifras numéricas. Lo que no encaja se descarta en vez de guardarse.
 */
export function cleanAnswers(
  funnel: FunnelConfig,
  raw: Record<string, unknown>,
): { answers: Answers; missing: string[] } {
  const answers: Answers = {};
  const missing: string[] = [];

  for (const q of funnel.questions) {
    const a = raw[q.id];
    const required = q.required !== false;

    if (q.type === "single") {
      if (typeof a === "string" && q.options.some((o) => o.value === a)) answers[q.id] = a;
      else if (required) missing.push(q.id);
    } else if (q.type === "multi") {
      const values = Array.isArray(a)
        ? a.filter((v): v is string => typeof v === "string" && q.options.some((o) => o.value === v))
        : [];
      if (values.length) answers[q.id] = [...new Set(values)];
      else if (required) missing.push(q.id);
    } else if (q.type === "text") {
      const text = typeof a === "string" ? a.trim().slice(0, MAX_TEXT) : "";
      if (text) answers[q.id] = text;
      else if (required) missing.push(q.id);
    } else if (q.type === "numbers") {
      const obj = a && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, unknown>) : {};
      const out: Record<string, string> = {};
      for (const f of q.fields) {
        const v = obj[f.id];
        const s = typeof v === "string" || typeof v === "number" ? String(v).trim().replace(",", ".") : "";
        if (s && /^\d{1,9}(\.\d{1,2})?$/.test(s)) out[f.id] = s;
      }
      if (Object.keys(out).length) answers[q.id] = out;
      else if (required) missing.push(q.id);
    }
  }

  return { answers, missing };
}
