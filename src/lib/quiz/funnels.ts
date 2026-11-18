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

  // Colores de scaled.es: negro verdoso, crema y rojo.
  theme: {
    background: "#050806",
    surface: "#0c100e",
    surfaceRaised: "#141a17",
    border: "rgba(246, 240, 230, 0.1)",
    text: "#f6f0e6",
    muted: "#9ca39e",
    accent: "#9c1f1c",
    accentBright: "#ec3b33",
    accentSoft: "rgba(236, 59, 51, 0.12)",
  },

  landing: {
    eyebrow: "Plan de escalado gratuito y personalizado",
    headline:
      "Recibe tu *plan de escalado de 90 días* hecho con el sistema que he aplicado en más de 300 negocios",
    subheadline:
      "Calculo la matemática hasta tu próximo objetivo de facturación, encuentro el cuello de " +
      "botella que te está frenando y te doy las palancas a tocar en orden, con objetivos semana a semana.",
    cta: "Quiero mi plan",
    footnote: "Unos 4 minutos · Gratis · Te lo explico en una llamada",
    videoUrl: null,
    mockupLabels: ["Plan de 90 días", "Cuello de botella"],

    how: {
      title: "Responde unas preguntas. Recibe tu plan.",
      lead: "Cuatro minutos. Lo que recibes depende de lo que me cuentes.",
      paragraphs: [
        "Tu plan se construye a partir de tus respuestas. Sin rodeos y sin plantillas: cuanto más concreto seas, más concreto será el plan.",
        "No me digas solo que algo no funciona. Dame el dato:",
      ],
      bad: "Los anuncios no me funcionan.",
      good:
        "Gasto 1.500 € al mes en Meta, me entran 90 conversaciones, agendo 20 llamadas, se presentan 12 " +
        "y cierro 2 a 2.000 €. No sé si el problema es el setting o la oferta.",
      closing: "Dame el detalle. Yo te doy los números.",
    },

    included: {
      title: "Qué incluye tu plan",
      caption: "Así es un plan por dentro, difuminado.",
      items: [
        {
          title: "La matemática",
          body:
            "De dónde estás a tu próximo objetivo, al revés: cuántas ventas, cuántas llamadas y cuántas " +
            "conversaciones necesitas cada mes con tu precio, tu cierre y tu show rate.",
        },
        {
          title: "El cuello de botella",
          body:
            "Una sola cosa, no una lista de diez. La que, si la arreglas primero, hace que todo lo demás " +
            "sea más fácil.",
        },
        {
          title: "Tus palancas",
          body:
            "Las acciones concretas para tu tipo de embudo, ordenadas por impacto: posicionamiento, ads, " +
            "contenido, setting o cierre, según dónde se te esté escapando el dinero.",
        },
        {
          title: "El plan de 90 días",
          body:
            "Tres bloques de cuatro semanas con tareas y una métrica a cumplir en cada checkpoint, para " +
            "saber si vas bien antes de pasar al siguiente.",
        },
        {
          title: "El error a evitar",
          body: "El fallo que más caro te puede salir ahora, elegido a partir de lo que ya has probado.",
        },
        {
          title: "Fase 2",
          body: "Qué cambia cuando llegues al objetivo, para que no te quedes parado después.",
        },
      ],
    },

    benefits: {
      title: "Qué te llevas",
      items: [
        {
          title: "Un objetivo con números detrás",
          body: "Dejas de adivinar qué es posible y trabajas hacia una cifra que sale de tu precio y tus tasas reales.",
        },
        {
          title: "Prioridades, no una lluvia de ideas",
          body: "Sabes qué tocar primero, segundo y tercero, y por qué ese orden importa en tu embudo.",
        },
        {
          title: "Respuestas directas",
          body:
            "A las dudas que llevas semanas dándole vueltas: si subir el precio, si meter un setter, si " +
            "invertir más en ads o arreglar antes el cierre.",
        },
        {
          title: "Estrategia convertida en ejecución",
          body: "Un calendario con tareas y métricas en cada checkpoint, para no quedarte con un plan y sin saber por dónde empezar.",
        },
        {
          title: "El camino después",
          body: "Qué viene cuando llegues a tu primer objetivo y qué tendrás que cambiar para seguir creciendo.",
        },
      ],
    },

    audience: {
      title: "Esto no es para todo el mundo",
      forTitle: "Es para ti si",
      forItems: [
        "Ya haces contenido.",
        "Ya vendes.",
        "Ya tienes prueba social.",
        "Pero tu agenda no se llena de gente cualificada.",
      ],
      notForTitle: "No es para ti si",
      notForItems: [
        "Empiezas de cero.",
        "Buscas que te lo hagan.",
        "Quieres otro funnel con VSL.",
        "No vas a ser honesto con tus números. El plan es tan bueno como los datos que me des.",
      ],
    },

    about: {
      title: "Quién te lo dice",
      name: "Toni Benítez",
      bio: [
        "Arquitecto operativo de Social Selling System: sistemas, ads y delivery para más de 300 clientes.",
        "Hoy trabajo por mi cuenta, con menos clientes y más implicación en cada uno.",
      ],
      photo: "/quiz/scaled/toni-benitez.webp",
      cases: [
        { name: "Moi — Mr. Boo", result: "Consultoría para DJs · de 3K a 50K €/mes", image: "/quiz/scaled/caso-moi-djs.webp" },
        { name: "Rubén", result: "Pérdida de grasa · de 300 a +25K €/mes", image: "/quiz/scaled/caso-ruben-25k.webp" },
        { name: "Victoria — Estrategias FX", result: "Trading · de 600 a 17K €/mes", image: "/quiz/scaled/caso-victoria-trading.webp" },
        { name: "Rubén — Healthsurfcoach", result: "Surf · de 0 a 5K €/mes", image: "/quiz/scaled/caso-ruben-surf.webp" },
      ],
    },

    faq: {
      title: "Preguntas frecuentes",
      items: [
        { q: "¿Es gratis?", a: "Sí. Rellenas el quiz y recibes tu plan sin pagar nada." },
        {
          q: "¿Cuánto tarda?",
          a: "Unos 4 minutos de preguntas y alrededor de un minuto más mientras se prepara el plan.",
        },
        {
          q: "¿Tengo que hacer una llamada?",
          a:
            "Ves el adelanto en el momento: tu cuello de botella, la matemática y la primera palanca. " +
            "El plan completo te lo explico en una llamada de 30 minutos para que salgas sabiendo qué hacer. " +
            "En esa llamada no se oferta nada: solo se audita tu sistema de adquisición.",
        },
        {
          q: "¿Y si no me sé mis números?",
          a: "Pon lo que sepas y deja en blanco el resto. No saberlos ya es un dato, y el plan te dirá cuáles medir primero.",
        },
        {
          q: "¿Sirve si no hago anuncios?",
          a: "Sí. El plan parte de cómo te llegan hoy los clientes, sea orgánico, outbound o referidos, y te dice si los ads tienen sentido ahora o todavía no.",
        },
        {
          q: "¿Qué hacéis con mis datos?",
          a: "Los usamos solo para preparar tu plan y contactarte sobre él. No los compartimos con nadie.",
        },
      ],
    },

    final: {
      title: "Dos opciones",
      body:
        "Puedes seguir tocando cosas a ciegas, cambiando la oferta, el contenido o los anuncios a ver " +
        "qué pasa. O puedes dedicar cuatro minutos y salir con la matemática, las palancas y el orden.",
      kicker: "Rellena el quiz. Recibe tu plan. Ejecuta.",
    },

    disclaimer: [
      "Las cifras del plan son estimaciones calculadas a partir de tus respuestas, no una promesa de ingresos. Los resultados dependen de cada negocio y de su ejecución. Los casos mostrados son reales, pero no son típicos.",
      "Este sitio no forma parte de Meta ni de Instagram, ni está respaldado por ellos.",
    ],
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
      "Tu plan completo incluye las palancas en orden, el plan de 90 días y el error " +
      "que más caro te puede salir. Te lo explicamos en una llamada de 30 minutos para que " +
      "salgas sabiendo exactamente qué hacer.",
    // Evento "Auditoría de Negocio con Toni" (30 min). Sus dos preguntas son
    // Instagram y teléfono, así que llegan ya rellenas desde el quiz.
    calendlyUrl: process.env.QUIZ_SCALED_CALENDLY_URL ?? "https://calendly.com/scaled1-1/auditoria",
    calendlyCta: "Agendar mi llamada",
    calendlyPrefill: { instagram: "a1", phone: "a2" },
    whatsappNumber: process.env.QUIZ_SCALED_WHATSAPP ?? null,
    whatsappCta: "Prefiero que me escribáis por WhatsApp",
    whatsappMessage: "Hola, acabo de hacer el quiz de scaled.es y quiero recibir mi plan de escalado.",
  },

  aiContext: `
scaled.es es la consultoría de adquisición de Toni Benítez para marcas personales (coaches,
mentores, consultores e infoproductores de habla hispana). Toni fue arquitecto operativo de Social
Selling System: sistemas, ads y delivery para más de 300 clientes.

Su tesis: el problema casi nunca es el tráfico, es el posicionamiento. "Primero posicionamiento.
Después, todo lo demás." Su método tiene ocho piezas: embudo de creencias, conocimiento profundo
del avatar, posicionamiento, ads para construir una audiencia de compradores, contenido de nutrición
y CTAs, setting (conversaciones por DM que cualifican y agendan), ventas por llamada y entrega.

Su programa, Ecosistema Social, lleva marcas personales a sus primeros 10.000–20.000 €/mes en 4-6
meses, done-with-you (lo implementan juntos, no se lo hace). Encaja mejor con quien ya hace
contenido, ya vende y ya tiene prueba social, pero no llena la agenda de gente cualificada. No
encaja con quien empieza de cero, quiere que se lo hagan o busca otro funnel con VSL.

El plan se explica al lead en una llamada de auditoría de 30 minutos.
`.trim(),

  slackChannel: process.env.SLACK_CHANNEL_LEADS ?? "#leads",
};

export const FUNNELS: Record<string, FunnelConfig> = {
  [scaled.slug]: scaled,
};

export function getFunnel(slug: string): FunnelConfig | null {
  return FUNNELS[slug] ?? null;
}
