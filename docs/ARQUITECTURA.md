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
- **EOD de setters**: un registro por setter y día (`eod_reports`, con índice único).
  Guarda DMs, conversaciones, follow-ups y agendas declaradas.
- **Carga de cierres**: crea el `deal`, lo enlaza con su `booking`, genera las
  cuotas en `payments` y avisa a Slack `#cierres`.

### 3. Métricas automáticas (crons diarios)
- Instagram Graph API -> `ig_daily_metrics` (seguidores totales, nuevos del día,
  alcance, visitas al perfil).
- Meta Marketing API -> `ads` + `ads_daily_metrics` (gasto por anuncio, incluidos
  los boosted posts creados desde la app de IG).

## Dónde se calcula cada número

Todo en vistas SQL (`supabase/migrations/0002_metrics.sql`), no en el frontend:

| Métrica | Vista | Fórmula |
|---|---|---|
| Tasa de agenda del setter | `v_setter_daily` | agendas reales de Calendly / conversaciones del EOD |
| Close rate del closer | `v_closer_daily` | cierres / llamadas celebradas |
| Cash collected | `v_cash_by_day` | cierre inicial + cuotas cobradas |
| ROAS | `v_daily_overview` | cash collected / gasto publicitario |
| Nuevos seguidores | `v_daily_overview` | `follower_count` diario de IG |
| Coste por seguidor | `v_daily_overview` | gasto del día / nuevos seguidores |
| Coste por seguidor por anuncio | `v_ad_performance` | gasto del anuncio / follows del anuncio |
| Coste por agenda | `v_daily_overview` | gasto / agendas del día |

Ventaja de tenerlo en SQL: la definición de "tasa de agenda" existe una sola vez.

## Seguridad
- RLS activo en todas las tablas. El equipo autenticado lee; escribir depende del rol.
- Un setter solo puede escribir su propio EOD.
- Webhooks y crons usan `service_role` (salta RLS) y validan firma o `CRON_SECRET`.
- El webhook de Calendly valida HMAC-SHA256 con ventana de 5 minutos.
