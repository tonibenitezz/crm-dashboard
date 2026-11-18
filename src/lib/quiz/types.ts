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

  /**
   * Colores del quiz (cualquier color CSS). Se aplican como variables a toda la
   * página, así que portada, preguntas y resultado salen con la marca.
   */
  theme: {
    background: string;
    surface: string;
    surfaceRaised: string;
    border: string;
    text: string;
    muted: string;
    /** Fondo de botones y CTA. */
    accent: string;
    /** Acento para textos y detalles (suele ser una versión más viva del anterior). */
    accentBright: string;
    accentSoft: string;
  };

  landing: {
    eyebrow: string;
    /** Lo que va entre *asteriscos* sale resaltado con el color de acento. */
    headline: string;
    subheadline: string;
    cta: string;
    footnote: string;
    /** Vídeo de YouTube/Vimeo/Loom para el hero (URL de embed). null = mockup del plan. */
    videoUrl: string | null;
    mockupLabels: [string, string];

    how: { title: string; lead: string; paragraphs: string[]; bad: string; good: string; closing: string };
    included: { title: string; caption: string; items: { title: string; body: string }[] };
    benefits: { title: string; items: { title: string; body: string }[] };
    audience: { title: string; forTitle: string; forItems: string[]; notForTitle: string; notForItems: string[] };
    about: {
      title: string;
      name: string;
      bio: string[];
      photo: string | null;
      cases: { name: string; result: string; image: string | null }[];
    };
    faq: { title: string; items: { q: string; a: string }[] };
    final: { title: string; body: string; kicker: string };
    disclaimer: string[];
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
    /**
     * Preguntas personalizadas del evento de Calendly que se rellenan solas:
     * a1 es la primera pregunta del formulario, a2 la segunda…
     */
    calendlyPrefill?: { instagram?: string; phone?: string };
    /** Número en formato internacional sin "+" ni espacios: 34600000000. */
    whatsappNumber: string | null;
    whatsappCta: string;
    whatsappMessage: string;
  };

  /** Cómo es el plan que recibe el lead. Cambia según el nicho. */
  plan: {
    /** Cómo se llama ante el lead: "plan de escalado", "plan para quitarte la barriga". */
    name: string;
    /** Duración del plan, en texto: "90 días". Siempre son 3 bloques de 4 semanas. */
    duration: string;
    /** Qué miden el punto de partida y el objetivo: "facturación mensual", "peso". */
    measure: string;
    /**
     * Las tres cifras clave que calcula la IA, en orden. Para un negocio:
     * ventas, agendas y leads al mes. Para pérdida de grasa: calorías, proteína y pasos.
     */
    metrics: [string, string, string];
    /** Valores de ejemplo de esas cifras, para el mockup difuminado de la portada. */
    metricExamples: [string, string, string];
    /** Rótulos del resultado. */
    labels: { obstacle: string; numbers: string };
    /** Frases que van saliendo mientras se genera el plan. */
    loading: string[];
  };

  ai: {
    /** Quién es la IA ante el lead: "el estratega de crecimiento de scaled.es". */
    role: string;
    /** Reglas propias del nicho, además de las comunes (tono, seguridad, cómo calcular). */
    rules: string[];
  };

  /**
   * Contexto que recibe la IA: quién eres, qué vendes, cómo trabajas.
   * Cuanto más concreto, mejor plan. Lo lee solo el modelo, no el lead.
   */
  aiContext: string;

  /** Canal de Slack donde avisar de cada lead nuevo. null = no avisar. */
  slackChannel: string | null;
};
