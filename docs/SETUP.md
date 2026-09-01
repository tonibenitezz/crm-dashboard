# Puesta en marcha

## 1. Supabase
1. Crear proyecto en supabase.com.
2. Aplicar las migraciones de `supabase/migrations/` en orden, desde el SQL Editor
   o con `supabase db push`.
3. Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` al `.env.local`.
4. Crear los usuarios en Authentication → Users (email y contraseña).
5. Dar de alta al equipo en `team_members`, enlazando cada uno con su usuario:

```sql
insert into team_members (auth_user_id, full_name, email, role) values
  ((select id from auth.users where email = 'toni@tudominio.com'),
   'Toni', 'toni@tudominio.com', 'admin');
```

Sin la fila en `team_members` no hay rol, y sin rol las políticas de RLS no dejan
leer nada: el usuario entra pero acaba en `/sin-acceso`.

## 2. Slack
1. api.slack.com/apps → Create New App → From scratch.
2. OAuth & Permissions → Bot Token Scopes: `chat:write` y `chat:write.public`.
3. Install to Workspace → copiar el `xoxb-...` a `SLACK_BOT_TOKEN`.
4. Crear los canales `#agendas` y `#cierres` e invitar al bot.
5. Para que las menciones funcionen, rellenar `slack_user_id` en `team_members`
   (perfil de Slack → More → Copy member ID).

## 3. Calendly
> Requiere plan Standard o superior: el plan gratuito no expone webhooks.

1. Sacar un Personal Access Token en calendly.com/integrations/api_webhooks.
2. Obtener la URI de la organización:
   ```bash
   curl -H "Authorization: Bearer $CALENDLY_PERSONAL_ACCESS_TOKEN" \
     https://api.calendly.com/users/me
   ```
3. Crear la suscripción apuntando al despliegue:
   ```bash
   curl -X POST https://api.calendly.com/webhook_subscriptions \
     -H "Authorization: Bearer $CALENDLY_PERSONAL_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://TU-DOMINIO/api/webhooks/calendly",
       "events": ["invitee.created", "invitee.canceled"],
       "organization": "TU_ORGANIZATION_URI",
       "scope": "organization"
     }'
   ```
4. La respuesta trae el `signing_key` → `CALENDLY_WEBHOOK_SIGNING_KEY`.
5. Rellenar `calendly_user_uri` en cada closer de `team_members` para que las
   agendas se les asignen solas (sale en `GET https://api.calendly.com/users/me`).

### Atribución del setter
Dos opciones, se pueden combinar:
- **Enlace por setter** (recomendado): cada setter comparte su enlace con
  `?utm_source=nombre-setter`. Llega en `tracking.utm_source`.
- **Pregunta en el formulario** de Calendly del tipo "¿Quién te contactó?".

## 4. Meta (Instagram + Ads)
1. La cuenta de IG debe ser **Business** y estar vinculada a una Página de Facebook.
2. developers.facebook.com → crear app de tipo Business.
3. Business Manager → System User → generar token de larga duración con
   `instagram_basic`, `instagram_manage_insights`, `ads_read`, `pages_read_engagement`.
4. Como los activos son tuyos y tú eres admin de la app, **no hace falta App Review**.
5. Copiar `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` (`act_...`) y `META_IG_USER_ID`.

## 5. Vercel
1. Importar el repo, añadir todas las variables de `.env.example`.
2. Generar un `CRON_SECRET` aleatorio (`openssl rand -hex 32`).
3. Los crons diarios se declaran en `vercel.json`.

## 6. Comprobar que todo responde

Con el proyecto desplegado:

```bash
# Debe devolver 401: el cron está protegido
curl -i https://TU-DOMINIO/api/cron/instagram

# Debe devolver 200 y el número de días sincronizados
curl -H "Authorization: Bearer $CRON_SECRET" https://TU-DOMINIO/api/cron/instagram

# Debe devolver 401: firma inválida
curl -X POST -d '{}' https://TU-DOMINIO/api/webhooks/calendly
```

Para el webhook de Calendly, la prueba de verdad es agendar una llamada contigo
mismo: debe aparecer en `/agendas` y llegar el aviso a `#agendas`.

## Marca

Todo el branding está en `src/app/globals.css`, en el bloque `:root` de arriba.
Hay que cambiar `--brand-500`, `--brand-600` y `--brand-50`, y la tipografía en
`--font-sans`. El logo sustituye a la letra en `src/app/(app)/layout.tsx` y en
`src/app/login/form.tsx`.

Los colores de los gráficos (`--series-1` … `--series-8`) están validados para
daltonismo. Si se cambian por los de la marca, hay que revalidarlos antes de
darlos por buenos: una paleta bonita puede ser ilegible para el 8% de los hombres.
