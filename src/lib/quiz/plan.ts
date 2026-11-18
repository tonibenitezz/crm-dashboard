import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import type { FunnelConfig, Question } from "./types";

/**
 * Forma del plan. La genera la IA con salida estructurada, así que siempre
 * llega con estos campos. Lo marcado como "interno" no se enseña al lead:
 * es para quien hace la llamada.
 */
export const PlanSchema = z.object({
  resumen: z.string().describe("Diagnóstico en 2-3 frases, hablando de tú al lead."),
  cuello_de_botella: z.object({
    titulo: z.string().describe("El constraint principal, en pocas palabras."),
    explicacion: z.string().describe("Por qué es este y no otro, apoyado en sus respuestas."),
    metrica_clave: z.string().describe("La métrica que lo delata y su valor actual vs. sano."),
  }),
  matematica: z.object({
    actual: z.string().describe("Facturación mensual actual estimada."),
    objetivo: z.string().describe("Objetivo mensual."),
    ventas_necesarias_mes: z.string(),
    agendas_necesarias_mes: z.string(),
    leads_necesarios_mes: z.string(),
    explicacion: z.string().describe("Cómo salen esas cifras, con los supuestos que usas."),
  }),
  palancas: z
    .array(
      z.object({
        titulo: z.string(),
        por_que: z.string(),
        accion: z.string().describe("Qué hacer, concreto y accionable."),
        kpi: z.string().describe("Cómo saber que funciona."),
      }),
    )
    .describe("Entre 3 y 5 palancas, en orden de prioridad."),
  plan_semanal: z
    .array(
      z.object({
        semana: z.string().describe("\"Semana 1\", \"Semana 2\"…"),
        foco: z.string(),
        acciones: z.array(z.string()),
        checkpoint: z.string().describe("Métrica que debe cumplirse para pasar a la siguiente."),
      }),
    )
    .describe("Exactamente 4 semanas."),
  error_a_evitar: z.string(),
  fase_2: z.string().describe("Qué viene después de cumplir este plan."),
  interno: z.object({
    encaje: z.enum(["alto", "medio", "bajo"]).describe("Encaje con lo que ofrece la empresa."),
    motivo_encaje: z.string(),
    preguntas_llamada: z.array(z.string()).describe("3-5 preguntas para la llamada de venta."),
    objeciones_probables: z.array(z.string()),
  }),
});

export type Plan = z.infer<typeof PlanSchema>;

/** Lo que ve el lead en pantalla antes de la llamada. */
export type PlanTeaser = {
  resumen: string;
  cuello_de_botella: Plan["cuello_de_botella"];
  matematica: Plan["matematica"];
  primera_palanca: Plan["palancas"][number] | null;
  palancas_restantes: string[];
  semanas: number;
};

export function toTeaser(plan: Plan): PlanTeaser {
  const [first, ...rest] = plan.palancas;
  return {
    resumen: plan.resumen,
    cuello_de_botella: plan.cuello_de_botella,
    matematica: plan.matematica,
    primera_palanca: first ?? null,
    palancas_restantes: rest.map((p) => p.titulo),
    semanas: plan.plan_semanal.length,
  };
}

export type Answers = Record<string, string | string[] | Record<string, string>>;

/** Respuestas en texto legible: pregunta → respuesta con la etiqueta, no el value. */
export function answersToText(questions: Question[], answers: Answers): string {
  const lines: string[] = [];
  for (const q of questions) {
    const a = answers[q.id];
    let text = "(sin respuesta)";
    if (q.type === "single" && typeof a === "string") {
      text = q.options.find((o) => o.value === a)?.label ?? a;
    } else if (q.type === "multi" && Array.isArray(a) && a.length) {
      text = a.map((v) => q.options.find((o) => o.value === v)?.label ?? v).join(", ");
    } else if (q.type === "text" && typeof a === "string" && a.trim()) {
      text = a.trim();
    } else if (q.type === "numbers" && a && typeof a === "object" && !Array.isArray(a)) {
      text = q.fields
        .map((f) => `${f.label}: ${a[f.id]?.trim() ? `${a[f.id]}${f.suffix ?? ""}` : "no lo sabe"}`)
        .join(" · ");
    }
    lines.push(`- ${q.title}\n  ${text}`);
  }
  return lines.join("\n");
}

function systemPrompt(funnel: FunnelConfig) {
  return `Eres el estratega de crecimiento de ${funnel.brand}. Preparas planes de escalado para
negocios que acaban de rellenar un quiz.

Sobre la empresa:
${funnel.aiContext}

Cómo escribir el plan:
- En español de España, tuteando al lead y con frases cortas. Nada de relleno ni de jerga vacía.
- Todo debe salir de sus respuestas. Cita sus cifras cuando las uses. Si falta un dato, usa un
  supuesto razonable para su tipo de negocio y dilo ("suponiendo un 20 % de cierre…").
- Si no sabe sus números de embudo, eso ya es un hallazgo: dilo.
- Un solo cuello de botella: el que más limita llegar al objetivo ahora. Puede no ser el que el
  lead cree; si no coincide, explica por qué.
- La matemática va del objetivo hacia atrás: ventas al mes = objetivo / precio, y de ahí agendas
  y leads con sus tasas (o con supuestos explícitos). Redondea hacia arriba.
- Las palancas van en orden de prioridad y son acciones concretas que puede empezar esta semana.
- No prometas resultados ni cifras garantizadas. No inventes casos de éxito ni testimonios.
- El bloque "interno" es para el closer que hará la llamada: sé franco sobre el encaje.`;
}

const MODEL = "claude-opus-5-5";

/**
 * Genera el plan. Usa salida estructurada (siempre devuelve PlanSchema) y la
 * reserva del servidor: si el modelo rechaza la petición, la API la repite
 * con otro modelo dentro de la misma llamada.
 */
export async function generatePlan(
  funnel: FunnelConfig,
  input: { name: string; answers: Answers },
): Promise<{ plan: Plan; model: string }> {
  const client = new Anthropic();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(PlanSchema),
    },
    system: systemPrompt(funnel),
    messages: [
      {
        role: "user",
        content: `Lead: ${input.name}\n\nRespuestas del quiz:\n${answersToText(funnel.questions, input.answers)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`La IA rechazó generar el plan (${response.stop_details?.category ?? "sin categoría"})`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("El plan se cortó por longitud");
  }
  if (!response.parsed_output) {
    throw new Error("La respuesta de la IA no tiene el formato del plan");
  }

  return { plan: response.parsed_output, model: response.model };
}
