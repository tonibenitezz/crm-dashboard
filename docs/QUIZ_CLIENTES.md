# Quiz funnel para clientes: SOP

Cada cliente tiene su propio quiz con el mismo motor que el de scaled.es: portada larga, preguntas
una a una, plan personalizado con IA, adelanto y CTA a su Calendly o su WhatsApp. Lo que cambia
es **qué plan recibe su lead**. El lead de Rubén no quiere un plan de escalado: quiere saber cuánto
comer y qué cambiar para quitarse la barriga.

## La idea clave: el plan es del nicho del cliente

Hay que decidir tres cosas para cada cliente:

| | Pregunta | Rubén (pérdida de grasa, hombres +40) |
|---|---|---|
| **Qué mide** | ¿Qué cifra quiere mover su lead? | Peso (y cintura) |
| **Las 3 cifras clave** | ¿Qué tres números necesita saber para empezar? | Calorías, proteína y pasos al día |
| **Las reglas** | ¿Cómo se calculan? ¿Qué no se puede decir nunca? | Mifflin-St Jeor, déficit moderado, nunca < 1.500 kcal, médico si hay medicación, nada de suplementos |

Con eso salen las preguntas: cada pregunta tiene que servir para calcular una cifra, encontrar el
obstáculo principal o cualificar para la llamada. Si no sirve para nada de eso, sobra.

El funnel de Rubén ya está hecho y sirve de ejemplo completo: `src/lib/quiz/clients/ruben.ts`.

### Propuesta para el resto de clientes

Son puntos de partida: valídalos con cada cliente antes de montarlos.

| Cliente | Plan | Mide | 3 cifras clave | Reglas que no pueden faltar |
|---|---|---|---|---|
| **Vania** (@vania.fit), ansiedad por comer y atracones, mujeres | Plan para dejar los atracones | Atracones a la semana | Comidas al día, horas entre comidas, atracones a la semana (objetivo) | Nada de déficit agresivo ni contar calorías. Si menciona vómitos, laxantes, ayunos extremos o un peso muy bajo, recomendar un profesional sanitario y marcarlo para la llamada. Tono cercano, sin culpa |
| **Estrategias FX** (Victoria), bots de trading | Plan para pasar al trading automatizado | Horas a la semana delante de la pantalla | Horas de pantalla a la semana, días hasta tener los bots instalados, revisiones a la semana | No es asesoramiento financiero. Nunca prometer rentabilidad ni recomendar cuánto invertir o qué apalancamiento usar. Avisar del riesgo de perder capital |
| **Moi** (Mr. Boo), DJs | Plan para llenar tu agenda de bolos | Bolos al mes | Bolos al mes, propuestas enviadas al mes, caché medio | La matemática va del objetivo hacia atrás, como en el de scaled: bolos = objetivo / caché, y de ahí propuestas con su tasa de cierre |

## El brief: lo que hay que pedirle al cliente

Copia esto y mándaselo. Con las respuestas se monta el funnel.

```
BRIEF PARA TU QUIZ FUNNEL

1. Tu negocio
   - ¿Qué haces y para quién? (una frase: "ayudo a X a conseguir Y")
   - Tu promesa, con tus palabras.
   - Tu método o mecanismo: ¿por qué funciona lo tuyo y no lo de siempre?
   - Lo que tu cliente ya ha probado y no le ha funcionado.

2. Tu cliente ideal
   - Edad, sexo, situación.
   - Sus 3 problemas principales, con las palabras exactas que usa.
   - Sus objeciones más habituales.
   - Para quién NO es lo tuyo.

3. El plan que recibirá
   - ¿Qué cifra quiere mover tu cliente? (peso, facturación, bolos, horas…)
   - ¿Qué 3 números necesita saber para empezar?
   - ¿Hay algo que nunca se le pueda decir o recomendar? (temas médicos, dinero…)

4. Tu oferta
   - Nombre del programa, duración y precio. (Solo lo ve quien hace la llamada, no el lead.)
   - Quién atiende los leads y quién hace las llamadas.

5. Prueba social
   - Casos reales con permiso: nombre, situación de partida, resultado y foto.
   - Tu bio en dos frases y una foto tuya.

6. Marca y destino
   - Colores en hexadecimal (fondo, texto y color principal) y logo.
   - Enlace de tu evento de Calendly y qué preguntas tiene, en orden.
   - Número de WhatsApp para leads, con prefijo.
   - Vídeo para la portada, si tienes (opcional).
```

## Ruta A (recomendada): lo montamos nosotros

1. El cliente rellena el brief.
2. Con el brief, se crea `src/lib/quiz/clients/<cliente>.ts` copiando el funnel más parecido
   (Rubén para salud y fitness, scaled para negocio). Se le puede pedir a Claude Code:
   *"Crea el funnel de Vania a partir de este brief, siguiendo docs/QUIZ_CLIENTES.md y usando
   clients/ruben.ts como modelo"*.
3. Se registra en `src/lib/quiz/funnels.ts` y se revisa en local en `/plan/<cliente>`.
4. Las fotos van en `public/quiz/<cliente>/`, en `.webp` y de menos de 900 px.
5. Se genera el paquete para su Lovable:

   ```bash
   python3 scripts/lovable/build.py <cliente>
   ```

   Sale `dist/lovable-<cliente>.zip` y la lista de `TODO` que faltan por rellenar.
6. Se monta en el Lovable del cliente siguiendo el README del zip: su Supabase, su API key de
   Claude, su Calendly y su WhatsApp. Los leads quedan en su base de datos, no en la nuestra.

## Ruta B: el cliente lo adapta en Lovable

Para un cliente que ya tiene el proyecto montado con un funnel de ejemplo (por ejemplo, el zip
de scaled o el de Rubén) y quiere adaptarlo él mismo. Pega esto en el chat de Lovable con el
brief rellenado debajo:

```
Este proyecto tiene un quiz funnel en src/quiz que genera un plan personalizado con IA mediante
la edge function supabase/functions/quiz-plan. Ahora está configurado para otro negocio y quiero
adaptarlo al mío con el brief que pego abajo.

Qué puedes tocar:
- SOLO src/quiz/funnel.ts y supabase/functions/_shared/funnel.ts. Los dos tienen que quedar
  idénticos.
- No cambies ningún otro archivo ni la estructura del objeto: respeta los tipos de
  src/quiz/types.ts.

Cómo adaptarlo:
1. slug, brand y owner con mi marca. theme con mis colores.
2. landing: reescribe todos los textos para mi cliente ideal. Estructura del mensaje: el problema
   de mi nicho, lo que ya han probado y no funciona, y mi forma de hacerlo. En el titular, pon
   entre *asteriscos* la parte que debe ir resaltada.
3. questions: entre 10 y 13 preguntas, una por pantalla. Opciones cerradas siempre que se pueda.
   Tienen que estar todas las que la IA necesita para calcular las 3 cifras del plan (usa el tipo
   "numbers" para medidas o cifras). La última pregunta es si está dispuesto a invertir en
   conseguirlo. Los id y value, en minúsculas y sin espacios.
4. plan: name, duration, measure, metrics (mis 3 cifras clave), metricExamples (valores de
   ejemplo creíbles), labels y loading, todo adaptado a mi nicho.
5. ai.role y ai.rules: cómo se calculan mis cifras, el tono y lo que nunca se puede decir. Si mi
   nicho toca salud, la IA debe mandar al médico ante cualquier condición o medicación. Si toca
   dinero, nada de asesoramiento financiero ni promesas de rentabilidad.
6. aiContext: mi negocio, mi método, mi oferta y para quién encaja y para quién no.
7. result: mi Calendly, mi WhatsApp y los textos finales. Si mi evento de Calendly pregunta
   Instagram o teléfono, rellena calendlyPrefill (a1 es la primera pregunta, a2 la segunda…).

Reglas:
- Español de España, tuteando, frases cortas, sin exageraciones.
- No inventes cifras, resultados, casos ni testimonios. Usa solo los del brief. Si no hay casos,
  deja cases vacío. Si falta un dato, déjalo como null y añade un comentario TODO.

Cuando termines, despliega de nuevo la edge function quiz-plan, enséñame la portada y dime qué
TODO quedan.

BRIEF:
[pega aquí el brief rellenado]
```

## Antes de publicar: la prueba de los tres perfiles

Haz el quiz tres veces con perfiles inventados y lee los tres planes enteros en el CRM o en
Supabase (`quiz_submissions.plan`):

1. **El ideal**: el cliente perfecto. El plan tiene que sonar al cliente y las cifras tienen que
   ser correctas (compruébalas a mano una vez).
2. **El que no encaja**: alguien fuera del público. El bloque interno debe marcar encaje bajo.
3. **El delicado**: el caso límite del nicho. En Rubén, alguien con medicación y un objetivo de
   peso poco realista. El plan tiene que mandarle al médico y proponer un objetivo intermedio.

Si alguno falla, ajusta `ai.rules` y repite. No se publica hasta que los tres salgan bien.

## Lanzamiento

- El enlace del quiz va en la bio y en las stories con CTA de agenda.
- Anuncios: primero retargeting a la audiencia que ya existe, después tráfico frío.
- Métrica a vigilar: de quiz a agenda. Si baja, revisa primero el adelanto y el CTA, no las
  preguntas.
