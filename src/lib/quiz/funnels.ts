import type { FunnelConfig } from "./types";

/**
 * Quiz de scaled.es. Es también la plantilla para los quiz de clientes:
 * copia el objeto, cambia slug, marca, preguntas y aiContext, y añádelo a
 * FUNNELS. Ver docs/QUIZ_FUNNEL.md.
 */
const scaled: FunnelConfig = {
  slug: "scaled",
  brand: "scaled.es",
  owner: "Toni",

  landing: {
    eyebrow: "Plan de escalado gratuito",
    headline: "Descubre qué te impide llegar a tu siguiente nivel de facturación",
    subheadline:
      "Responde unas preguntas sobre tu negocio y te preparamos un plan personalizado: " +
      "el cuello de botella que te está frenando, los números que necesitas y las palancas " +
      "a tocar en orden.",
    bullets: [
      "La matemática exacta hasta tu objetivo: ventas, agendas y leads al mes",
      "El cuello de botella principal de tu embudo, con la métrica que lo delata",
      "Las palancas a tocar en orden y un plan de 4 semanas",
    ],
    cta: "Quiero mi plan",
    footnote: "Unos 4 minutos · Gratis · Sin compromiso",
  },

  questions: [
    {
      id: "oferta",
      type: "single",
      title: "¿Qué vendes?",
      options: [
        { value: "mentoria_1a1", label: "Mentoría o coaching 1 a 1" },
        { value: "programa_grupal", label: "Programa grupal o high-ticket" },
        { value: "curso", label: "Curso o infoproducto de bajo precio" },
        { value: "servicio", label: "Servicio o agencia" },
        { value: "otro", label: "Otra cosa" },
      ],
    },
    {
      id: "nicho",
      type: "text",
      title: "¿A quién ayudas y a conseguir qué?",
      subtitle: "En una frase. Ej.: \"Ayudo a fisioterapeutas a llenar su agenda sin depender de mutuas\".",
      placeholder: "Ayudo a… a…",
      multiline: true,
    },
    {
      id: "precio",
      type: "single",
      title: "¿Cuánto cuesta tu oferta principal?",
      options: [
        { value: "<500", label: "Menos de 500 €" },
        { value: "500-1500", label: "500 € – 1.500 €" },
        { value: "1500-3000", label: "1.500 € – 3.000 €" },
        { value: "3000-6000", label: "3.000 € – 6.000 €" },
        { value: ">6000", label: "Más de 6.000 €" },
      ],
    },
    {
      id: "facturacion",
      type: "single",
      title: "¿Cuánto facturas al mes ahora mismo?",
      subtitle: "Media de los últimos 3 meses.",
      options: [
        { value: "<5k", label: "Menos de 5.000 €" },
        { value: "5-10k", label: "5.000 € – 10.000 €" },
        { value: "10-30k", label: "10.000 € – 30.000 €" },
        { value: "30-60k", label: "30.000 € – 60.000 €" },
        { value: "60-100k", label: "60.000 € – 100.000 €" },
        { value: ">100k", label: "Más de 100.000 €" },
      ],
    },
    {
      id: "objetivo",
      type: "single",
      title: "¿A cuánto quieres llegar al mes en 6 meses?",
      options: [
        { value: "10k", label: "10.000 €" },
        { value: "30k", label: "30.000 €" },
        { value: "50k", label: "50.000 €" },
        { value: "100k", label: "100.000 €" },
        { value: ">100k", label: "Más de 100.000 €" },
      ],
    },
    {
      id: "captacion",
      type: "multi",
      title: "¿De dónde te llegan los clientes hoy?",
      subtitle: "Marca todas las que apliquen.",
      options: [
        { value: "organico_ig", label: "Contenido orgánico en Instagram" },
        { value: "youtube", label: "YouTube" },
        { value: "meta_ads", label: "Anuncios en Meta (IG / Facebook)" },
        { value: "outbound", label: "Prospección por DM / outbound" },
        { value: "referidos", label: "Referidos y boca a boca" },
        { value: "otro", label: "Otro" },
      ],
    },
    {
      id: "venta",
      type: "single",
      title: "¿Cómo cierras las ventas?",
      options: [
        { value: "llamada_yo", label: "Llamada de venta, la hago yo" },
        { value: "setter_closer", label: "Tengo equipo de setters y/o closers" },
        { value: "dm_whatsapp", label: "Por DM o WhatsApp, sin llamada" },
        { value: "checkout", label: "Compra directa (VSL, página de venta)" },
        { value: "webinar", label: "Webinar o lanzamiento" },
      ],
    },
    {
      id: "numeros",
      type: "numbers",
      title: "Tus números de un mes normal",
      subtitle: "Aproximado vale. Deja en blanco lo que no sepas: eso también nos dice algo.",
      required: false,
      fields: [
        { id: "leads_mes", label: "Leads o conversaciones nuevas", placeholder: "120" },
        { id: "agendas_mes", label: "Llamadas agendadas", placeholder: "30" },
        { id: "show_rate", label: "Se presentan a la llamada", suffix: "%", placeholder: "70" },
        { id: "cierre", label: "De los que se presentan, compran", suffix: "%", placeholder: "20" },
      ],
    },
    {
      id: "ads",
      type: "single",
      title: "¿Cuánto inviertes en anuncios al mes?",
      options: [
        { value: "0", label: "Nada, todo es orgánico" },
        { value: "<1k", label: "Menos de 1.000 €" },
        { value: "1-3k", label: "1.000 € – 3.000 €" },
        { value: "3-10k", label: "3.000 € – 10.000 €" },
        { value: ">10k", label: "Más de 10.000 €" },
      ],
    },
    {
      id: "freno",
      type: "single",
      title: "¿Qué crees que te está frenando más ahora mismo?",
      options: [
        { value: "pocos_leads", label: "No entran suficientes leads" },
        { value: "no_agendan", label: "Entran leads, pero no agendan" },
        { value: "no_cierran", label: "Agendan, pero no se presentan o no compran" },
        { value: "tiempo", label: "Todo depende de mí y no llego" },
        { value: "oferta", label: "Mi oferta no convence o no sé bien qué vender" },
      ],
    },
    {
      id: "probado",
      type: "text",
      title: "¿Qué has probado ya que no te ha funcionado?",
      subtitle: "Opcional, pero cuanto más concreto, mejor plan.",
      placeholder: "Ej.: probé anuncios a un lead magnet y los leads no respondían a los DMs…",
      multiline: true,
      required: false,
    },
    {
      id: "inversion",
      type: "single",
      title: "Si el plan tiene sentido, ¿estás en posición de invertir en escalar en los próximos 30 días?",
      options: [
        { value: "si", label: "Sí, quiero moverme ya" },
        { value: "depende", label: "Depende de lo que vea" },
        { value: "no", label: "Ahora mismo no" },
      ],
    },
  ],

  contact: {
    title: "¿A quién le preparamos el plan?",
    subtitle: "Lo revisamos y te lo explicamos para que sepas exactamente por dónde empezar.",
    askInstagram: true,
    consent: "Al continuar aceptas que te contactemos por email o WhatsApp sobre tu plan.",
  },

  result: {
    headline: "Tu plan está listo",
    body:
      "Tu plan completo incluye las palancas en orden, el plan semana a semana y el error " +
      "que más caro te puede salir. Te lo explicamos en una llamada de 30 minutos para que " +
      "salgas sabiendo exactamente qué hacer.",
    calendlyUrl: process.env.QUIZ_SCALED_CALENDLY_URL ?? null,
    calendlyCta: "Agendar mi llamada",
    whatsappNumber: process.env.QUIZ_SCALED_WHATSAPP ?? null,
    whatsappCta: "Prefiero que me escribáis por WhatsApp",
    whatsappMessage: "Hola, acabo de hacer el quiz de scaled.es y quiero recibir mi plan de escalado.",
  },

  aiContext: `
scaled.es es la agencia de Toni Benítez. Ayuda a coaches, mentores e infoproductores de habla
hispana a escalar su facturación con un sistema de adquisición: contenido y anuncios en Meta e
Instagram que llevan a conversaciones por DM, setters que cualifican y agendan, y closers que
cierran ofertas high-ticket por llamada. También trabaja la oferta y los procesos de venta.
El plan lo revisa el equipo y se explica al lead en una llamada.
`.trim(),

  slackChannel: process.env.SLACK_CHANNEL_LEADS ?? "#leads",
};

export const FUNNELS: Record<string, FunnelConfig> = {
  [scaled.slug]: scaled,
};

export function getFunnel(slug: string): FunnelConfig | null {
  return FUNNELS[slug] ?? null;
}
