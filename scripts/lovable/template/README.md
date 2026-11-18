# Quiz funnel de {{BRAND}} para Lovable

Quiz funnel completo (portada, preguntas, plan con IA, adelanto y CTA a Calendly o
WhatsApp) para un proyecto de Lovable (React + Vite + Supabase).

## Qué hay en el paquete

| Ruta | Qué es |
|---|---|
| `src/quiz/Quiz.tsx` | El quiz: preguntas, datos de contacto, carga y resultado |
| `src/quiz/Landing.tsx` | La portada larga |
| `src/quiz/funnel.ts` | **Todos los textos, preguntas, colores, cifras del plan, reglas de la IA, Calendly y WhatsApp** |
| `src/quiz/funnels.ts` | Registro del funnel (no hace falta tocarlo) |
| `src/quiz/types.ts` | Tipos |
| `src/quiz/quiz.css` | Tipografías y estilos del quiz |
| `src/pages/Plan.tsx` | La página que monta el quiz |
| `public/quiz/` | Fotos y casos |
| `supabase/functions/quiz-plan/` | La función que guarda el lead y genera el plan con Claude |
| `supabase/functions/_shared/` | Lo que usa la función: preguntas, prompt de la IA y validación |
| `sql/` | Las tablas, en dos versiones (ver paso 4) |

## Pasos

### 1. Crea el proyecto y conecta Supabase
En Lovable, crea un proyecto y conéctale Supabase.

**Recomendado: conecta el mismo Supabase del CRM.** Así los leads del quiz caen en la misma
base de datos y los sigues viendo en la pestaña Quiz del CRM, con el plan completo y el guion
de llamada. Con un Supabase nuevo funciona igual, pero los leads quedan aparte.

### 2. Mete los archivos en el proyecto
Lo más fiable es por GitHub:
1. En Lovable: conectar GitHub. Crea un repositorio sincronizado con el proyecto.
2. Copia en ese repositorio las carpetas `src/quiz`, `src/pages/Plan.tsx`, `public/quiz` y
   `supabase/functions` tal cual, respetando las rutas.
3. Haz commit y push. Lovable lo recoge solo.


### 3. Pega este mensaje en el chat de Lovable

```
He añadido un quiz en src/quiz, la página src/pages/Plan.tsx y la edge function
supabase/functions/quiz-plan (que usa supabase/functions/_shared). Sin tocar esos archivos:
1. En App.tsx, haz que las rutas "/" y "/plan" muestren la página Plan.
2. En src/main.tsx, importa "./quiz/quiz.css".
3. Despliega la edge function quiz-plan.
No cambies colores, textos ni estilos del quiz: ya están definidos en src/quiz/funnel.ts.
```

### 4. Crea las tablas
En Supabase → SQL Editor, ejecuta **uno** de los dos:
- `sql/1_si_usas_el_supabase_del_crm.sql`: si conectaste el Supabase del CRM (si ya
  aplicaste la migración `0004_quiz.sql` del CRM, sáltate esto).
- `sql/2_si_es_un_supabase_nuevo.sql`: si es un Supabase nuevo.

### 5. Añade los secretos
En Supabase → Edge Functions → Secrets:
- `ANTHROPIC_API_KEY`: tu API key de platform.claude.com. Obligatoria.
- `SLACK_BOT_TOKEN`: opcional, para el aviso en `#leads`.

### 6. Pon tu WhatsApp
En `src/quiz/funnel.ts`, busca `whatsappNumber` y pon tu número con prefijo y sin
"+" (`"34600000000"`). Sin él no sale el botón de WhatsApp. Pon también `calendlyUrl`.

### 7. Pruébalo
Haz el quiz entero tú mismo y revisa que el plan que sale tenga sentido.

## Importante al editar

`funnel.ts` está **dos veces**: en `src/quiz/` (lo que ve el lead) y en
`supabase/functions/_shared/` (lo que usa la IA y la validación). Si cambias preguntas u
opciones, cámbialas en los dos y vuelve a desplegar la función. Los textos de la portada solo
hace falta tocarlos en `src/quiz/`. Busca `TODO` en `funnel.ts`: son los datos que faltan.

No cambies el `id` de una pregunta ni el `value` de una opción una vez en marcha: es lo que se
guarda en la base de datos.

## Límites

- Cada plan tarda entre 30 segundos y 2 minutos en generarse, y la función de Supabase tiene un
  tiempo máximo por petición que depende de tu plan de Supabase. Si ves planes cortados por
  tiempo en los logs, ese es el motivo.
- El SDK de Claude está fijado a la versión 1.9.0.
