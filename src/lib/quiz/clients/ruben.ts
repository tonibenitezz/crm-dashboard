import type { FunnelConfig } from "../types";

/**
 * Quiz de Rubén (@soyruben.fitness): pérdida de grasa para hombres de +40.
 * Ejemplo de funnel de cliente: mismo motor que el de scaled.es, con preguntas,
 * cifras, tono y reglas de la IA de su nicho.
 *
 * TODO antes de publicarlo (marcado con TODO abajo): colores de su marca, foto,
 * casos con permiso, Calendly del equipo, WhatsApp de Tania y su oferta.
 */
export const ruben: FunnelConfig = {
  slug: "ruben",
  brand: "soyruben.fitness",
  owner: "Rubén",

  // TODO: sustituir por los colores de su marca. De momento, oscuro con acento naranja.
  theme: {
    background: "#07090c",
    surface: "#0f1318",
    surfaceRaised: "#171c23",
    border: "rgba(240, 244, 248, 0.1)",
    text: "#f2f4f7",
    muted: "#9aa3ad",
    accent: "#c2410c",
    accentBright: "#fb923c",
    accentSoft: "rgba(251, 146, 60, 0.12)",
  },

  landing: {
    eyebrow: "Plan gratuito para hombres de más de 40",
    headline: "*Quítate la barriga* después de los 40 sin matarte a entrenar ni dejar la cerveza del finde",
    subheadline:
      "Responde unas preguntas y te preparamos un plan hecho para ti: tus calorías, tu proteína y tus " +
      "pasos, lo que te está frenando y qué cambiar primero, semana a semana.",
    cta: "Quiero mi plan",
    footnote: "Unos 3 minutos · Gratis · Te lo explicamos en una llamada",
    videoUrl: null,
    mockupLabels: ["Plan de 12 semanas", "Lo que te frena"],

    how: {
      title: "Responde unas preguntas. Recibe tu plan.",
      lead: "Tres minutos. Cuanto más sincero seas, más útil será el plan.",
      paragraphs: [
        "El plan se calcula con tus datos: tu peso, tu día a día, tu estrés, tu sueño y lo que comes y bebes de verdad. Nada de plantillas.",
        "No te quedes en lo genérico. Cuéntalo tal cual:",
      ],
      bad: "Quiero perder peso.",
      good:
        "Peso 94 kg y mido 1,78. Trabajo sentado 9 horas, duermo 6, entreno un día a la semana y el finde " +
        "caen 6 u 8 cervezas. Probé el ayuno y lo dejé a las tres semanas por ansiedad.",
      closing: "Dame tus datos. Te doy un plan que puedas mantener.",
    },

    included: {
      title: "Qué incluye tu plan",
      caption: "Así es un plan por dentro, difuminado.",
      items: [
        { title: "Tus números", body: "Las calorías, la proteína y los pasos que necesitas cada día, calculados con tu peso, tu altura, tu edad y tu actividad." },
        { title: "Lo que te está frenando", body: "Una sola cosa, no una lista de diez. La que, si la cambias primero, hace que todo lo demás cueste menos." },
        { title: "Tus palancas", body: "Los cambios concretos para tu caso, por orden: comida, entreno, sueño, estrés o el finde, según dónde se te esté escapando." },
        { title: "El plan de 12 semanas", body: "Tres bloques de cuatro semanas con lo que hay que hacer y un objetivo a cumplir en cada uno para saber que vas bien." },
        { title: "El error a evitar", body: "El fallo que más te puede costar ahora, elegido a partir de lo que ya has probado." },
        { title: "Fase 2", body: "Cómo mantenerlo cuando llegues, para no volver a donde estabas." },
      ],
    },

    benefits: {
      title: "Qué te llevas",
      items: [
        { title: "Saber cuánto comer", body: "Una cifra de calorías y de proteína hecha para ti, no la de una app genérica." },
        { title: "Un entreno que cabe en tu semana", body: "Sin vivir en el gimnasio: lo justo para perder grasa y no perder músculo." },
        { title: "El finde incluido", body: "Cómo encajar las cervezas y las comidas fuera sin tirar la semana a la basura." },
        { title: "Menos estrés, mejor descanso", body: "Qué tocar en tu sueño y tu estrés, que también influyen en el hambre y en la barriga." },
        { title: "Un plan que se mantiene", body: "Pensado para que dure más de tres semanas, que es donde se caen casi todas las dietas." },
      ],
    },

    audience: {
      title: "Esto no es para todo el mundo",
      forTitle: "Es para ti si",
      forItems: [
        "Tienes más de 40.",
        "Te sobra barriga y te cuesta más que antes.",
        "Tienes poco tiempo y bastante estrés.",
        "Quieres algo que puedas mantener, no otra dieta de tres semanas.",
      ],
      notForTitle: "No es para ti si",
      notForItems: [
        "Buscas perder 10 kilos en un mes.",
        "Quieres pastillas o atajos.",
        "No estás dispuesto a cambiar nada de tu rutina.",
      ],
    },

    about: {
      title: "Quién está detrás",
      name: "Rubén",
      // TODO: confirmar las cifras con Rubén.
      bio: [
        "Entrenador online para hombres de más de 40 que quieren perder grasa.",
        "Más de 1.000 hombres ayudados a quitarse la barriga sin matarse a entrenar, sin dejar la cerveza del finde y sin comer solo pollo y arroz.",
      ],
      photo: null, // TODO: /quiz/ruben/ruben.webp
      cases: [], // TODO: antes/después con permiso de cada cliente
    },

    faq: {
      title: "Preguntas frecuentes",
      items: [
        { q: "¿Es gratis?", a: "Sí. Rellenas el quiz y recibes tu plan sin pagar nada." },
        { q: "¿Sirve si tengo más de 50?", a: "Sí. El plan se calcula con tu edad, y está pensado justo para hombres de más de 40." },
        { q: "¿Tengo que dejar la cerveza?", a: "No. El plan te dice cómo encajarla en tu semana sin cargarte el progreso." },
        { q: "¿Y si no tengo tiempo para entrenar?", a: "El plan parte del tiempo que tienes de verdad. Lo mínimo que funciona, no lo máximo que aguantas." },
        {
          q: "Tengo una condición médica o tomo medicación. ¿Me sirve?",
          a: "El plan es orientativo y no sustituye a tu médico. Si tomas medicación o tienes alguna condición, consúltalo con él antes de cambiar tu alimentación o tu entreno, y dínoslo en el quiz para tenerlo en cuenta.",
        },
        {
          q: "¿Tengo que hacer una llamada?",
          a: "Ves un adelanto en el momento. El plan completo te lo explicamos en una llamada corta para que salgas sabiendo qué hacer desde mañana.",
        },
        { q: "¿Qué hacéis con mis datos?", a: "Los usamos solo para preparar tu plan y contactarte sobre él. No los compartimos con nadie." },
      ],
    },

    final: {
      title: "Dos opciones",
      body:
        "Puedes probar otra dieta de pollo y arroz, matarte en el gimnasio un mes y dejarlo como las " +
        "otras veces. O puedes dedicar tres minutos y salir con tus números, lo que te frena y un plan " +
        "que puedas mantener.",
      kicker: "Rellena el quiz. Recibe tu plan. Empieza el lunes.",
    },

    disclaimer: [
      "Este plan es orientativo, se calcula a partir de tus respuestas y no es consejo médico ni sustituye la valoración de un profesional sanitario. Si tienes una condición médica o tomas medicación, consulta a tu médico antes de cambiar tu alimentación o tu actividad física.",
      "Los resultados dependen de cada persona y de su constancia.",
      "Este sitio no forma parte de Meta ni de Instagram, ni está respaldado por ellos.",
    ],
  },

  questions: [
    {
      id: "edad",
      type: "single",
      title: "¿Cuántos años tienes?",
      options: [
        { value: "<40", label: "Menos de 40" },
        { value: "40-44", label: "40 – 44" },
        { value: "45-49", label: "45 – 49" },
        { value: "50-54", label: "50 – 54" },
        { value: "55+", label: "55 o más" },
      ],
    },
    {
      id: "medidas",
      type: "numbers",
      title: "Tus medidas",
      subtitle: "Con lo que marque la báscula esta semana vale.",
      fields: [
        { id: "peso", label: "Peso actual", suffix: "kg", placeholder: "92" },
        { id: "altura", label: "Altura", suffix: "cm", placeholder: "178" },
        { id: "objetivo", label: "Peso al que te gustaría llegar", suffix: "kg", placeholder: "84" },
        { id: "cintura", label: "Cintura a la altura del ombligo (opcional)", suffix: "cm", placeholder: "102" },
      ],
    },
    {
      id: "dia",
      type: "single",
      title: "¿Cómo es tu día a día?",
      options: [
        { value: "sentado", label: "Sentado casi todo el día" },
        { value: "mixto", label: "Mitad sentado, mitad moviéndome" },
        { value: "activo", label: "De pie o con trabajo físico" },
      ],
    },
    {
      id: "entreno",
      type: "single",
      title: "¿Cuánto entrenas ahora mismo?",
      options: [
        { value: "0", label: "Nada" },
        { value: "1-2", label: "1 o 2 días a la semana" },
        { value: "3-4", label: "3 o 4 días" },
        { value: "5+", label: "5 días o más" },
      ],
    },
    {
      id: "estres",
      type: "single",
      title: "¿Cuánto estrés llevas encima?",
      options: [
        { value: "bajo", label: "Poco, voy tranquilo" },
        { value: "medio", label: "Lo normal" },
        { value: "alto", label: "Bastante" },
        { value: "tope", label: "Voy a tope" },
      ],
    },
    {
      id: "sueno",
      type: "single",
      title: "¿Cuántas horas duermes de media?",
      options: [
        { value: "<5", label: "Menos de 5" },
        { value: "5-6", label: "Entre 5 y 6" },
        { value: "6-7", label: "Entre 6 y 7" },
        { value: "7+", label: "7 o más" },
      ],
    },
    {
      id: "comida",
      type: "multi",
      title: "¿Cómo comes normalmente?",
      subtitle: "Marca todo lo que te pase.",
      options: [
        { value: "picoteo", label: "Pico entre horas" },
        { value: "noche", label: "Ceno tarde o pico por la noche" },
        { value: "fuera", label: "Como fuera a menudo" },
        { value: "saltar", label: "Me salto comidas y luego como mucho" },
        { value: "ordenado", label: "Como bastante ordenado" },
      ],
    },
    {
      id: "alcohol",
      type: "single",
      title: "¿Cuánto bebes a la semana?",
      options: [
        { value: "nada", label: "Nada o casi nada" },
        { value: "finde_poco", label: "Alguna cerveza el finde" },
        { value: "finde_mucho", label: "Varias cervezas o copas el finde" },
        { value: "diario", label: "Algo casi todos los días" },
      ],
    },
    {
      id: "probado",
      type: "multi",
      title: "¿Qué has probado ya?",
      options: [
        { value: "dieta_estricta", label: "Dietas estrictas" },
        { value: "ayuno", label: "Ayuno intermitente" },
        { value: "gym_solo", label: "Ir al gimnasio por mi cuenta" },
        { value: "apps", label: "Apps de contar calorías" },
        { value: "entrenador", label: "Entrenador o nutricionista" },
        { value: "nada", label: "Nada todavía" },
      ],
    },
    {
      id: "freno",
      type: "single",
      title: "¿Qué te ha hecho dejarlo otras veces?",
      options: [
        { value: "tiempo", label: "Falta de tiempo" },
        { value: "hambre", label: "Pasar hambre o ansiedad" },
        { value: "resultados", label: "No ver resultados rápido" },
        { value: "finde", label: "Los findes y las comidas fuera" },
        { value: "dolor", label: "Lesiones o dolores" },
        { value: "nunca", label: "Nunca me he puesto en serio" },
      ],
    },
    {
      id: "salud",
      type: "single",
      title: "¿Tienes alguna condición médica o tomas medicación?",
      subtitle: "Por ejemplo, tensión alta, colesterol, diabetes o problemas de corazón.",
      options: [
        { value: "no", label: "No" },
        { value: "si", label: "Sí" },
        { value: "nsnc", label: "Prefiero no decirlo" },
      ],
    },
    {
      id: "motivo",
      type: "text",
      title: "¿Por qué ahora?",
      subtitle: "Opcional. ¿Qué ha pasado para que quieras cambiarlo de verdad?",
      placeholder: "Ej.: me vi en una foto de la boda de mi hermano y no me reconocí…",
      multiline: true,
      required: false,
    },
    {
      id: "inversion",
      type: "single",
      title: "Si el plan te encaja, ¿estarías dispuesto a invertir en un acompañamiento para conseguirlo?",
      options: [
        { value: "si", label: "Sí, quiero hacerlo ya" },
        { value: "depende", label: "Depende de lo que vea" },
        { value: "no", label: "Ahora mismo no" },
      ],
    },
  ],

  contact: {
    title: "¿A quién le preparamos el plan?",
    subtitle: "Lo revisamos y te lo explicamos para que sepas qué hacer desde mañana.",
    askInstagram: true,
    consent: "Al continuar aceptas que te contactemos por email o WhatsApp sobre tu plan.",
  },

  result: {
    headline: "Tu plan está listo",
    body:
      "Tu plan completo incluye los cambios en orden, las 12 semanas paso a paso y el error que más te " +
      "puede costar. Te lo explicamos en una llamada corta para que empieces sabiendo qué hacer.",
    calendlyUrl: null, // TODO: enlace del evento de Calendly del equipo de Rubén
    calendlyCta: "Agendar mi llamada",
    whatsappNumber: null, // TODO: WhatsApp de Tania, con prefijo y sin "+"
    whatsappCta: "Prefiero que me escribáis por WhatsApp",
    whatsappMessage: "Hola, acabo de hacer el quiz de Rubén y quiero recibir mi plan.",
  },

  plan: {
    name: "plan para quitarte la barriga",
    duration: "12 semanas",
    measure: "peso en kg (y la cintura en cm si la ha dado)",
    metrics: ["Calorías al día", "Proteína al día", "Pasos al día"],
    metricExamples: ["2.150", "150 g", "7.000"],
    labels: { obstacle: "Lo que te está frenando", numbers: "Tus números" },
    loading: [
      "Leyendo tus respuestas…",
      "Calculando tus calorías y tu proteína…",
      "Mirando tu sueño, tu estrés y tu día a día…",
      "Buscando lo que te está frenando…",
      "Montando tus 12 semanas…",
      "Repasando los últimos detalles…",
    ],
  },

  ai: {
    role: "el equipo de Rubén (@soyruben.fitness), entrenador online especializado en hombres de más de 40",
    rules: [
      "Calcula el gasto con Mifflin-St Jeor para hombre y un factor de actividad según su día a día y su entreno. Explica el cálculo en una frase.",
      "Déficit moderado: una pérdida de entre el 0,5 % y el 1 % del peso por semana como máximo. Nunca propongas menos de 1.500 kcal al día.",
      "Proteína entre 1,6 y 2 g por kilo de peso objetivo, redondeada.",
      "Los pasos, realistas para su día a día: si va sentado, una subida progresiva, no 15.000 desde el primer día.",
      "Entreno de fuerza corto, de 2 a 4 sesiones a la semana según su tiempo. Nada de machacarse.",
      "El alcohol del finde se planifica, no se prohíbe: dile cómo encajarlo.",
      "Nada de dietas de solo pollo y arroz: comida normal, bien repartida.",
      "Sueño y estrés son palancas: afectan al hambre, a la recuperación y a dónde se acumula la grasa. Háblalo con prudencia, sin prometer milagros hormonales ni 'acelerar el metabolismo' como algo mágico.",
      "Si dice que tiene una condición médica o toma medicación, o no lo quiere decir, recomiéndale que consulte a su médico antes de cambiar dieta o entreno y no des pautas que puedan chocar con ello. En el bloque interno, márcalo para la llamada.",
      "Si el objetivo de peso es poco realista o poco sano para su altura, dilo y propón uno intermedio.",
      "No recomiendes suplementos, fármacos ni productos.",
      "Sin jerga técnica: habla como un entrenador cercano que sabe lo que hace.",
    ],
  },

  aiContext: `
Rubén (@soyruben.fitness) es entrenador online para hombres de más de 40 que quieren perder grasa.
Tiene unos 100.000 seguidores y ha ayudado a más de 1.000 hombres.

Promesa: quitarse la barriga con estrés, sin matarse a entrenar, sin dejar la cerveza del finde y sin
comer solo pollo y arroz. Su enfoque pone el foco en el metabolismo y en bajar el estrés (cortisol):
entreno de fuerza corto, comida normal, descanso y gestión del estrés.

Su equipo: Tania lleva la agenda y los leads, y hay closers que hacen las llamadas.
Oferta: acompañamiento online (TODO: nombre del programa, duración y precio, para valorar el encaje).
Encaja mejor con hombres de 40 a 60 con barriga, poco tiempo y estrés, que quieren algo sostenible.
Encaja peor con quien busca resultados extremos en semanas o no quiere cambiar su rutina.
`.trim(),

  slackChannel: null,
};
