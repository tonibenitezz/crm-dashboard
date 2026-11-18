/**
 * Tipos del quiz funnel. Un "funnel" es un quiz completo con su marca,
 * preguntas y destino final (Calendly / WhatsApp). Para montar el de un
 * cliente basta con añadir otra entrada en `funnels.ts`.
 */

export type Option = { value: string; label: string; hint?: string };

type Base = {
  /** Clave con la que se guarda la respuesta. No cambiarla una vez en producción. */
  id: string;
  /** Pregunta tal y como la ve el lead. */
  title: string;
  subtitle?: string;
  /** Si es false, se puede saltar. Por defecto, obligatoria. */
  required?: boolean;
};

export type Question =
  | (Base & { type: "single"; options: Option[] })
  | (Base & { type: "multi"; options: Option[] })
  | (Base & { type: "text"; placeholder?: string; multiline?: boolean })
  | (Base & {
      /** Varias cifras en una pantalla (p. ej. los números del embudo). */
      type: "numbers";
      fields: { id: string; label: string; suffix?: string; placeholder?: string }[];
    });

export type FunnelConfig = {
  slug: string;
  /** Marca que aparece en la cabecera del quiz. */
  brand: string;
  /** Nombre de quien firma el plan ("Toni"). */
  owner: string;

  landing: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    bullets: string[];
    cta: string;
    footnote: string;
  };

  questions: Question[];

  contact: {
    title: string;
    subtitle: string;
    /** Pide Instagram además de nombre, email y WhatsApp. */
    askInstagram: boolean;
    consent: string;
  };

  result: {
    /** Texto de la pantalla final, encima del CTA. */
    headline: string;
    body: string;
    calendlyUrl: string | null;
    calendlyCta: string;
    /** Número en formato internacional sin "+" ni espacios: 34600000000. */
    whatsappNumber: string | null;
    whatsappCta: string;
    whatsappMessage: string;
  };

  /**
   * Contexto que recibe la IA: quién eres, qué vendes, cómo trabajas.
   * Cuanto más concreto, mejor plan. Lo lee solo el modelo, no el lead.
   */
  aiContext: string;

  /** Canal de Slack donde avisar de cada lead nuevo. null = no avisar. */
  slackChannel: string | null;
};
