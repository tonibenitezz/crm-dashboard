# CRM Dashboard

CRM interno que sustituye a Airtable: agendas de Calendly, cierres, EOD de setters
y métricas de Instagram y Meta Ads, con avisos automáticos a Slack.

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — stack, flujos y dónde se calcula cada métrica
- [`docs/COSTES.md`](docs/COSTES.md) — coste mensual y qué hay que validar
- [`docs/SETUP.md`](docs/SETUP.md) — puesta en marcha

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y rellenar
npm run dev
```

Las migraciones están en `supabase/migrations/`, se aplican en orden.
