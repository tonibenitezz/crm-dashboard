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
    titulo: z.string().describe("El obstáculo principal, en pocas palabras."),
    explicacion: z.string().describe("Por qué es este y no otro, apoyado en sus respuestas."),
    metrica_clave: z.string().describe("El dato que lo delata: su valor actual frente a uno sano."),
  }),
  numeros: z.object({
    actual: z.string().describe("Punto de partida, con su unidad."),
    objetivo: z.string().describe("Objetivo, con su unidad."),
    metricas: z
      .array(z.object({ etiqueta: z.string(), valor: z.string().describe("Cifra corta con unidad.") }))
      .describe("Exactamente las 3 cifras clave indicadas en las instrucciones, en ese orden."),
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
        semana: z.string().describe("\"Semanas 1-4\", \"Semanas 5-8\" o \"Semanas 9-12\"."),
        foco: z.string(),
        acciones: z.array(z.string()),
        checkpoint: z.string().describe("Métrica que debe cumplirse para pasar a la siguiente."),
      }),
    )
    .describe("Exactamente 3 bloques: \"Semanas 1-4\", \"Semanas 5-8\" y \"Semanas 9-12\"."),
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
  numeros: Plan["numeros"];
  primera_palanca: Plan["palancas"][number] | null;
  palancas_restantes: string[];
  bloques: number;
};

export function toTeaser(plan: Plan): PlanTeaser {
  const [first, ...rest] = plan.palancas;
  return {
    resumen: plan.resumen,
    cuello_de_botella: plan.cuello_de_botella,
    numeros: plan.numeros,
    primera_palanca: first ?? null,
    palancas_restantes: rest.map((p) => p.titulo),
    bloques: plan.plan_semanal.length,
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

/** Exportado para poder revisar el prompt de cada funnel. */
export function systemPrompt(funnel: FunnelConfig) {
  const p = funnel.plan;
  const rules = [
    "Español de España, tuteando al lead y con frases cortas. Nada de relleno ni de jerga vacía.",
    "Todo debe salir de sus respuestas. Cita sus datos cuando los uses. Si falta uno, usa un supuesto razonable y dilo (\"suponiendo…\").",
    "Si no sabe un dato clave, eso ya es un hallazgo: dilo.",
    "Un solo obstáculo principal: el que más le limita para llegar al objetivo ahora. Puede no ser el que el lead cree; si no coincide, explica por qué.",
    `Punto de partida y objetivo miden su ${p.measure}.`,
    `Las tres cifras clave son, en este orden: ${p.metrics.map((m, i) => `${i + 1}) ${m}`).join(", ")}. Usa esas etiquetas tal cual.`,
    "Las palancas, entre 3 y 5, van en orden de prioridad y son acciones concretas que puede empezar esta semana.",
    `El plan cubre ${p.duration} en tres bloques de cuatro semanas (\"Semanas 1-4\", \"Semanas 5-8\", \"Semanas 9-12\"), cada uno con su checkpoint.`,
    "No prometas resultados ni cifras garantizadas. No inventes casos de éxito ni testimonios.",
    "No menciones precios ni nombres de programas en lo que ve el lead: eso se habla en la llamada. Sí puedes valorar el encaje en el bloque interno.",
    "El bloque \"interno\" es para quien hará la llamada: sé franco sobre el encaje.",
    ...funnel.ai.rules,
  ];

  return `Eres ${funnel.ai.role}. Preparas planes personalizados ("${p.name}") para personas que
acaban de rellenar un quiz.

Sobre la marca:
${funnel.aiContext}

Cómo escribir el plan:
${rules.map((r) => `- ${r}`).join("\n")}`;
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
