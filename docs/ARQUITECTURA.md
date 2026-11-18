# Arquitectura

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| App | Next.js 16 (App Router) + TypeScript | Un solo despliegue sirve el dashboard, los formularios y los webhooks |
| UI | Tailwind 4 + tokens de marca | El branding vive en variables CSS, se cambia en un sitio |
| Datos | Supabase (Postgres + Auth + RLS) | Postgres real: las métricas se calculan en SQL, no a mano |
| Hosting | Vercel | Webhooks y crons incluidos, despliegue por push |
| Avisos | Slack Bot (`chat.postMessage`) | Bloques ricos y varios canales con una credencial |

## Flujos

### 1. Alguien agenda por Calendly
```
Calendly  --(webhook invitee.created)-->  /api/webhooks/calendly
   verifica firma HMAC
   -> upsert lead (por email)
   -> resuelve closer (URI de Calendly del anfitrión -> team_members)
   -> resuelve setter (UTM del enlace, o pregunta del formulario)
   -> upsert booking (idempotente por calendly_invitee_uri)
   -> Slack #agendas (una sola vez, con notification_log)
```
`invitee.canceled` marca la agenda como `cancelada` o `reagendada`.

### 2. Formularios internos
- **EOD de setters** (`/eod`): un parte por setter y día, con índice único, así que
  reenviarlo actualiza en vez de duplicar. Inbound y outbound separados. Las tasas
  se ven en vivo al teclear y las recalcula Postgres al guardar.
- **Carga de cierres** (`/cierres`): crea el `deal`, genera las cuotas en `payments`,
  marca como cerrada la agenda de origen y avisa a Slack `#cierres`.

### 3. Quiz funnel
```
/plan/[funnel] (público)  --POST-->  /api/quiz/[funnel]
   valida respuestas contra las preguntas del funnel (y campo trampa anti-bots)
   -> upsert lead (por email, source quiz:<funnel>)
   -> quiz_submissions (estado "generando")
   -> Claude genera el plan con salida estructurada (lib/quiz/plan.ts)
   -> guarda el plan; el lead ve solo el adelanto (cuello de botella, matemática, palanca #1)
   -> CTA a Calendly (nombre, email y UTM rellenados) o WhatsApp
   -> Slack #leads, después de responder
```
El plan completo y el bloque interno para el closer se ven en `/quiz/[id]`. Como el lead
se enlaza por email, cuando agenda por Calendly la agenda cae en la misma ficha.

### 4. Métricas automáticas (crons diarios)
- Instagram Graph API -> `ig_daily_metrics` (seguidores totales, nuevos del día,
  alcance, visitas al perfil).
- Meta Marketing API -> `ads` + `ads_daily_metrics` (gasto por anuncio, incluidos
  los boosted posts creados desde la app de IG).

## Dónde se calcula cada número

Todo en vistas SQL (`supabase/migrations/0002_metrics.sql`), no en el frontend:

| Métrica | Vista | Fórmula |
|---|---|---|
| Tasa de agenda del setter | `v_setter_daily` | agendas reales de Calendly / conversaciones totales del EOD |
| Tasas de respuesta inb/out | `eod_reports` | columnas generadas por Postgres, nadie las teclea |
| KPI Closer completo | `v_closer_daily` | no-shows, cualificadas, % de cierre, full pay vs cuotas |
| Cash collected | `v_cash_by_day` | cuotas con estado `cobrado` |
| Valor contratado | `v_contracted_by_day` | suma de tickets firmados |
| ROAS | `v_daily_overview` | cash cobrado / gasto publicitario (y otra versión sobre contratado) |
| Nuevos seguidores | `v_daily_overview` | `follower_count` diario de IG |
| Coste por seguidor | `v_daily_overview` | gasto del día / nuevos seguidores |
| Coste por seguidor por anuncio | `v_ad_performance` | gasto del anuncio / follows del anuncio |
| Coste por agenda y por cierre | `v_daily_overview` | gasto / agendas, gasto / cierres |
| Facturación por programa | `v_program_performance` | cierres, contratado y cobrado por SSS Core, Lite, etc. |

Ventaja de tenerlo en SQL: la definición de "tasa de agenda" existe una sola vez.

## Pantallas

| Ruta | Qué hace | Quién entra |
|---|---|---|
| `/` | Dashboard: cash collected, ROAS, coste por agenda y por seguidor, series y rankings | Todo el equipo |
| `/agendas` | Agendas de Calendly con estado y pipeline | Todo el equipo |
| `/cierres` | Carga de cierres y últimos cierres | Todo el equipo |
| `/eod` | Parte diario del setter | Todo el equipo |
| `/quiz` | Leads del quiz, plan completo y guion de llamada | Todo el equipo |
| `/plan` | Quiz funnel público (redirige a `/plan/scaled`) | Público |
| `/equipo` | KPIs por setter y closer, y la plantilla | Solo admin y manager |
| `/login` | Email y contraseña | Público |

## Seguridad
- RLS activo en todas las tablas. El equipo autenticado lee; escribir depende del rol.
- Un setter solo puede escribir su propio EOD; un manager puede escribir el de otro.
- `proxy.ts` (en Next 16 el antiguo `middleware.ts`) refresca la sesión y bloquea
  todo lo que no sea `/login`, los webhooks y los crons. Valida con `getUser()`,
  que revalida el token contra Supabase, no con `getSession()`, que se fía de la cookie.
- Entrar en Supabase no basta: sin ficha en `team_members` no hay rol, y sin rol
  las políticas no dejan leer nada. Esos usuarios acaban en `/sin-acceso`.
- El login no distingue "no existe" de "contraseña incorrecta": hacerlo permitiría
  averiguar quién tiene cuenta.
- Webhooks y crons usan `service_role` (salta RLS) y validan firma o `CRON_SECRET`.
- El webhook de Calendly valida HMAC-SHA256 con ventana de 5 minutos.

## Gráficos

La paleta de series vive en `globals.css` junto a los tokens de marca y está
validada para daltonismo en claro y en oscuro (separación CVD ΔE 9,1 y 8,4 sobre
un objetivo de 8). Tres colores del modo claro quedan por debajo de 3:1 de
contraste, así que los gráficos llevan siempre leyenda, etiqueta directa y una
tabla con los mismos números: la identidad nunca depende solo del color.

Ningún gráfico usa doble eje. Cuando dos medidas no comparten escala van en
gráficos separados; cash collected e inversión sí comparten eje porque los dos
son euros.
