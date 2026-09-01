# Costes y viabilidad

> Precios de lista consultados en 2026. Conviene reconfirmarlos antes de contratar.

## Resumen: sí, todo es posible. Con un matiz importante (ver "Zona gris").

## Coste mensual real

| Servicio | Para qué | Plan mínimo que sirve | Coste |
|---|---|---|---|
| **Vercel** | Hosting, webhooks, crons | Hobby vale técnicamente, pero uso comercial pide **Pro** | 0 € / **20 $/mes** |
| **Supabase** | Base de datos, auth, RLS | Free aguanta el principio (se pausa si no hay tráfico 7 días). Pro para producción | 0 € / **25 $/mes** |
| **Calendly** | Webhooks de agenda | **Standard o superior** — el plan gratuito NO da webhooks | **~12-16 $/usuario/mes** |
| **Slack** | Avisos de agendas y cierres | Gratis (las apps y `chat.postMessage` funcionan en el plan free) | **0 €** |
| **Meta Graph API** (Instagram) | Seguidores, alcance, visitas al perfil | Gratis | **0 €** |
| **Meta Marketing API** (Ads) | Gasto por anuncio, boosted posts | Gratis | **0 €** |
| **Dominio** | `crm.tudominio.com` | — | ~12 €/año |

**Escenario arranque:** ~12-16 €/mes (solo Calendly, resto en free).
**Escenario producción:** ~60-65 €/mes con Vercel Pro + Supabase Pro + Calendly.

Airtable, para comparar, cuesta 20-24 $/usuario/mes en el plan Team. Con 4 personas
ya son ~90 $/mes, así que esto sale más barato desde el segundo o tercer usuario.

## Construirlo aquí vs. Lovable

**Recomendación: aquí.** Lovable es rápido para maquetar pantallas, pero este
proyecto es un 70% de trabajo que Lovable no resuelve: verificación de firmas de
webhooks, idempotencia, crons, la API de Meta, y las vistas SQL de métricas. Ahí
acabas escribiendo el mismo código igualmente, pero pagando **25 $/mes extra** y
gastando créditos en cada iteración. Además el resultado ya vive en tu GitHub,
sin depender de la plataforma.

## Zona gris: lo que hay que validar antes de prometerlo

Todo lo demás es estándar. Estos tres puntos tienen riesgo real:

1. **Boosted posts desde la app de IG.** Al promocionar desde el móvil, Meta crea
   el anuncio en una cuenta publicitaria asociada a la Página. Normalmente se lee
   con la Marketing API, pero si esas promociones se pagaron sin una cuenta
   publicitaria dentro de tu Business Manager, la API puede no verlas. **Se
   comprueba en 10 minutos** entrando en Business Manager y mirando si los boosts
   aparecen listados como anuncios. Si no aparecen, el plan B es la tabla
   `ad_spend_manual` (ya está en el esquema): metes el gasto a mano y el resto de
   métricas siguen calculándose solas.

2. **Coste por seguidor por anuncio concreto.** Meta no atribuye seguidores a
   anuncios de forma fiable: para promociones con objetivo de perfil sí reporta
   `follows`, pero para un boost de engagement normal, no. Lo honesto es:
   - Coste por seguidor **global del mes**: exacto (gasto total / nuevos seguidores).
   - Coste por seguidor **por anuncio**: aproximado, mejor usar coste por visita
     al perfil, que sí es un dato real por anuncio. La vista `v_ad_performance`
     calcula las dos cosas.

3. **Nuevos seguidores por día.** La métrica `follower_count` de Instagram solo
   devuelve los **últimos 30 días**. Por eso el cron guarda un snapshot diario:
   a partir del día que arranque, el histórico es tuyo para siempre. Lo anterior
   a la puesta en marcha no se puede recuperar.

## Lo que no tiene ninguna complicación

Agendas de Calendly al CRM, avisos a Slack de agenda y de cierre, formularios de
EOD y de carga de cierres, cash collected, ROAS, tasa de agenda por setter, close
rate, seguidores totales, alcance, visitas al perfil, y el branding completo.
