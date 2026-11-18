# Quiz funnel: SOP

Un quiz de unas 12 preguntas que termina en un plan de escalado generado con IA. El lead
deja nombre, email y WhatsApp para verlo. Ve un adelanto, y el plan completo se le explica
en una llamada.

## El recorrido del lead

1. **Portada** (`/plan`): página de venta larga con los colores y tipografías de la marca:
   hero con mockup del plan (o vídeo, si se pone `videoUrl`), cómo funciona, qué incluye,
   qué te llevas, para quién es y para quién no, quién está detrás con casos, FAQ y cierre.
2. **Preguntas**, una por pantalla. Las de opción única avanzan solas; hay barra de progreso
   y botón de atrás. Si recarga la página, conserva lo que ya había contestado.
3. **Datos**: nombre, email, WhatsApp e Instagram (opcional). Van al final, cuando ya ha
   invertido tiempo en el quiz.
4. **Carga** (30 s – 2 min) mientras la IA prepara el plan.
5. **Adelanto**: diagnóstico, cuello de botella, la matemática hasta su objetivo y la
   palanca #1. El resto (palancas 2-5, plan de 4 semanas, error a evitar, fase 2) aparece
   bloqueado.
6. **CTA**: *Agendar mi llamada* (Calendly con nombre, email y UTM ya rellenados) o
   *Prefiero que me escribáis por WhatsApp*.

Si la IA falla, el lead igualmente queda guardado y ve una pantalla de "lo terminamos a mano"
con los mismos CTA.

## Qué hace el equipo

1. Llega el aviso a Slack `#leads` con las respuestas y el cuello de botella.
2. En el CRM → **Quiz** están todos los envíos, con su encaje (alto/medio/bajo) y si ya
   agendaron.
3. La ficha del lead (`/quiz/<id>`) tiene:
   - el plan completo, para presentarlo en la llamada;
   - **Para la llamada**: motivo del encaje, preguntas para hacer y objeciones probables
     (esto nunca lo ve el lead);
   - botón **Escribir por WhatsApp** con un mensaje ya redactado que menciona su cuello
     de botella;
   - **Marcar como contactado** y notas.
4. Si no agenda solo en unas horas, escribirle por WhatsApp desde la ficha.

Métrica a vigilar: **Quiz → agenda** (arriba en la pantalla Quiz). Si baja, mirar primero la
pantalla de adelanto y el CTA, no las preguntas.

## Enlaces

- `https://TU-DOMINIO/plan` → quiz de scaled.es. Los UTM se conservan:
  `/plan?utm_source=instagram&utm_medium=bio`.
- Si un setter comparte el quiz con `?utm_source=<su-nombre>`, ese UTM viaja hasta Calendly
  y la agenda se le atribuye sola, igual que con su enlace de Calendly.

## Montarlo para un cliente

Todo el quiz sale de un objeto de configuración en `src/lib/quiz/funnels.ts`.

1. Copia el objeto `scaled` y cambia:
   - `slug` → la URL será `/plan/<slug>`;
   - `brand` y `owner`;
   - `theme`: los colores de su marca (fondo, tarjetas, texto, acento…);
   - `landing`: todos los textos de la portada. En el titular, lo que va entre
     `*asteriscos*` sale en el color de acento. Fotos y casos van en `public/quiz/<slug>/`;
   - `questions`: mantén `facturacion` (la usa el CRM) y añade o quita el resto. Tipos:
     `single`, `multi`, `text`, `numbers`. Con `required: false` se pueden saltar;
   - `result`: textos finales, Calendly y WhatsApp del cliente. `calendlyPrefill` rellena
     solas las preguntas del evento de Calendly (`a1` = la primera, `a2` = la segunda…);
   - **`aiContext`**: quién es el cliente, qué vende, a quién y cómo trabaja. Es lo que más
     influye en la calidad del plan;
   - `slackChannel`: canal para sus leads, o `null`.
2. Añádelo a `FUNNELS`.
3. Haz una prueba completa tú mismo antes de compartir el enlace.

Los leads de los clientes caen en este mismo CRM, filtrados por `funnel`. Si el cliente
necesita su propio CRM, despliega una copia del repo con solo su funnel.

Reglas al tocar preguntas en producción:
- No cambies el `id` de una pregunta ni el `value` de una opción: es lo que se guarda y lo
  que lee la IA. Los textos (`title`, `label`) sí se pueden cambiar.
- Menos preguntas convierte más. Cada pregunta tiene que cambiar el plan; si no, sobra.

## Coste y límites

- Cada plan es una llamada a Claude Opus 5.5 con salida estructurada. Coste orientativo:
  entre 10 y 20 céntimos por lead (unos 2.000 tokens de entrada y 4.000-8.000 de salida).
- Si la misma persona reenvía el quiz en menos de 15 minutos, se le devuelve el plan ya
  hecho, sin generar otro.
- El campo trampa invisible descarta bots sin gastar nada.
- Si el modelo rechazara una petición, la API la repite automáticamente con otro modelo
  (`fallbacks: "default"`).

## Variables de entorno

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Generar el plan |
| `QUIZ_SCALED_CALENDLY_URL` | Botón de agendar. Por defecto, el evento "Auditoría de Negocio con Toni" |
| `QUIZ_SCALED_WHATSAPP` | Botón de WhatsApp (`34600000000`) |
| `SLACK_CHANNEL_LEADS` | Canal de avisos (por defecto `#leads`) |
