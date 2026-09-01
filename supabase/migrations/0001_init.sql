-- ============================================================
-- CRM Dashboard — esquema inicial
-- Modelado a partir de las tablas reales de Airtable:
-- Booking Calls, Cierres, KPI Setter, KPI Closer y Programas.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
create type member_role     as enum ('admin', 'manager', 'setter', 'closer');
create type lead_status     as enum ('nuevo', 'contactado', 'agendado', 'no_show', 'cerrado', 'perdido');
create type booking_status  as enum ('agendada', 'completada', 'no_show', 'cancelada', 'reagendada');
-- Refleja el campo "Closing Status" de Booking Calls
create type closing_status  as enum ('para_cerrar', 'seguimiento', 'closed', 'no_califica', 'perdido');
create type deal_status     as enum ('cerrado', 'reembolsado', 'impagado', 'cancelado');
create type payment_status  as enum ('pendiente', 'cobrado', 'fallido', 'reembolsado');
-- "Tipo de pago" en Cierres
create type payment_kind    as enum ('full_pay', 'plan_completo', 'cuotas');

-- ---------- Programas ----------
create table programs (
  id               uuid primary key default gen_random_uuid(),
  name             text unique not null,          -- SSS Core, SSS Lite, MasterMind, Inner Circle
  duration_months  int,
  duration_days    int,
  active           boolean not null default true,
  sort_order       int not null default 0
);

-- ---------- Equipo ----------
create table team_members (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique,
  full_name         text not null,
  email             text unique not null,
  role              member_role not null default 'setter',

  -- En Airtable el mismo closer aparece como "Toni Benítez" y como "Toni".
  -- Los alias permiten importar el histórico y absorber esas variantes.
  aliases           text[] not null default '{}',

  calendly_user_uri text unique,
  slack_user_id     text,
  instagram_handle  text,

  -- Comisiones: en el histórico el setter cobra el 5% del ticket
  commission_rate   numeric(5,4) not null default 0,

  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index team_aliases_idx on team_members using gin (aliases);

-- ---------- Leads / contactos ----------
create table leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text,
  email             text,
  phone             text,
  whatsapp_url      text,
  instagram_handle  text,
  country           text,
  -- "Facturación Actual": la respuesta de cualificación del formulario
  current_revenue   text,
  source            text,                          -- Instagram, Vsl, Youtube, Whatsapp
  setter_id         uuid references team_members(id) on delete set null,
  status            lead_status not null default 'nuevo',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index leads_email_uniq on leads (lower(email)) where email is not null;
create index leads_ig_idx     on leads (lower(instagram_handle));
create index leads_setter_idx on leads (setter_id);

-- ---------- Agendas (Booking Calls / Calendly) ----------
create table bookings (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid references leads(id) on delete set null,
  closer_id            uuid references team_members(id) on delete set null,
  setter_id            uuid references team_members(id) on delete set null,
  program_id           uuid references programs(id) on delete set null,  -- "Producto"

  calendly_event_uri   text unique,                -- idempotencia del webhook
  calendly_invitee_uri text unique,
  event_type_name      text,

  scheduled_at         timestamptz not null,       -- "Fecha de agenda": cuándo es la llamada
  booked_at            timestamptz not null default now(), -- "Evento": cuándo se agendó
  timezone             text,

  status               booking_status not null default 'agendada',
  closing_status       closing_status not null default 'para_cerrar',
  cancel_reason        text,
  canceled_at          timestamptz,

  -- Datos del lead capturados en el momento de la agenda
  invitee_name         text,
  invitee_email        text,
  phone                text,
  whatsapp_url         text,
  instagram_handle     text,
  current_revenue      text,

  call_notes           text,
  follow_up_setter     text,

  -- Atribución
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  utm_term             text,

  answers              jsonb not null default '{}'::jsonb,
  raw_payload          jsonb,
  airtable_record_id   text unique,                -- trazabilidad de la migración

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index bookings_scheduled_idx on bookings (scheduled_at desc);
create index bookings_booked_idx    on bookings (booked_at desc);
create index bookings_setter_idx    on bookings (setter_id, booked_at desc);
create index bookings_closer_idx    on bookings (closer_id, scheduled_at desc);
create index bookings_status_idx    on bookings (status, closing_status);

-- ---------- Cierres ----------
create table deals (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid references bookings(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  closer_id       uuid references team_members(id) on delete set null,
  setter_id       uuid references team_members(id) on delete set null,
  program_id      uuid references programs(id) on delete set null,

  deal_name       text,
  closed_at       date not null default current_date,
  country         text,
  source          text,                            -- "Fuente Manual"
  payment_method  text,                            -- Transferencia, SeQura, Stripe, Hotmart
  payment_kind    payment_kind not null default 'full_pay',

  -- Importes. Se guarda la divisa explícita: el histórico mezcla $ y €.
  ticket          numeric(12,2) not null default 0,  -- valor total del contrato
  currency        text not null default 'EUR',

  -- Reserva / señal
  deposit_amount   numeric(12,2),
  deposit_paid     boolean not null default false,
  deposit_due_on   date,

  -- Comisiones (se calculan al crear, pero quedan editables)
  commission_closer numeric(12,2) not null default 0,
  commission_setter numeric(12,2) not null default 0,

  status          deal_status not null default 'cerrado',
  notes           text,
  created_by      uuid references team_members(id) on delete set null,
  airtable_record_id text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index deals_closed_idx  on deals (closed_at desc);
create index deals_closer_idx  on deals (closer_id, closed_at desc);
create index deals_setter_idx  on deals (setter_id, closed_at desc);
create index deals_program_idx on deals (program_id);

-- ---------- Cobros (cuotas y comprobantes) ----------
create table payments (
  id                 uuid primary key default gen_random_uuid(),
  deal_id            uuid not null references deals(id) on delete cascade,
  installment_number int not null default 1,        -- 1º, 2º, 3º pago
  amount             numeric(12,2) not null,
  currency           text not null default 'EUR',
  due_on             date,
  paid_at            date,
  method             text,
  proof_url          text,                          -- "Comprobante" (Supabase Storage)
  status             payment_status not null default 'pendiente',
  created_at         timestamptz not null default now(),
  unique (deal_id, installment_number)
);
create index payments_deal_idx on payments (deal_id);
create index payments_paid_idx on payments (paid_at) where paid_at is not null;

-- ---------- EOD de setters (tabla KPI Setter) ----------
create table eod_reports (
  id                      uuid primary key default gen_random_uuid(),
  setter_id               uuid not null references team_members(id) on delete cascade,
  report_date             date not null default current_date,

  -- Inbound
  inbound_conversations   int not null default 0,   -- Convers Abiertas Inb
  inbound_replies         int not null default 0,   -- Respuestas Inb
  -- Outbound
  outbound_conversations  int not null default 0,   -- Convers Out
  outbound_replies        int not null default 0,   -- Respuestas Out
  -- Embudo hasta la agenda
  calendly_links_sent     int not null default 0,   -- Calendly pasados
  calls_booked            int not null default 0,   -- Llamadas agendadas
  -- Seguimientos
  follow_ups              int not null default 0,   -- Seguimiento
  follow_up_replies       int not null default 0,   -- Respuestas seguimiento

  mood                    text,                     -- Emoción del día
  trained                 boolean,                  -- ¿Entrenaste?
  notes                   text,

  -- Totales y tasas: los calcula Postgres, nadie los teclea ni se desincronizan
  total_conversations int generated always as
    (inbound_conversations + outbound_conversations) stored,
  inbound_reply_rate numeric(6,4) generated always as
    (round(inbound_replies::numeric / nullif(inbound_conversations, 0), 4)) stored,
  outbound_reply_rate numeric(6,4) generated always as
    (round(outbound_replies::numeric / nullif(outbound_conversations, 0), 4)) stored,
  booking_rate numeric(6,4) generated always as
    (round(calls_booked::numeric
           / nullif(inbound_conversations + outbound_conversations, 0), 4)) stored,
  follow_up_reply_rate numeric(6,4) generated always as
    (round(follow_up_replies::numeric / nullif(follow_ups, 0), 4)) stored,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (setter_id, report_date)
);
create index eod_date_idx on eod_reports (report_date desc);

-- ---------- Métricas diarias de Instagram ----------
create table ig_daily_metrics (
  metric_date       date primary key,
  followers_count   int,          -- total de seguidores al cierre del día
  follows_delta     int,          -- nuevos seguidores del día
  reach             int,
  impressions       int,
  profile_views     int,
  website_clicks    int,
  accounts_engaged  int,
  raw               jsonb,
  synced_at         timestamptz not null default now()
);

-- ---------- Meta Ads (incluye boosted posts de IG) ----------
create table ads (
  ad_id               text primary key,
  ad_name             text,
  adset_id            text,
  adset_name          text,
  campaign_id         text,
  campaign_name       text,
  objective           text,
  effective_status    text,
  instagram_permalink text,
  created_time        timestamptz,
  synced_at           timestamptz not null default now()
);

create table ads_daily_metrics (
  metric_date    date not null,
  ad_id          text not null references ads(ad_id) on delete cascade,
  spend          numeric(12,2) not null default 0,
  impressions    int not null default 0,
  reach          int not null default 0,
  clicks         int not null default 0,
  profile_visits int not null default 0,
  follows        int not null default 0,
  currency       text not null default 'EUR',
  raw            jsonb,
  synced_at      timestamptz not null default now(),
  primary key (metric_date, ad_id)
);
create index ads_daily_date_idx on ads_daily_metrics (metric_date desc);

-- ---------- Gasto publicitario manual (plan B si la API no ve los boosts) ----------
create table ad_spend_manual (
  id           uuid primary key default gen_random_uuid(),
  spend_date   date not null,
  amount       numeric(12,2) not null,
  currency     text not null default 'EUR',
  platform     text not null default 'instagram',
  label        text,
  created_at   timestamptz not null default now()
);

-- ---------- Log de notificaciones (idempotencia de Slack) ----------
create table notification_log (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null,
  kind         text not null,
  entity_id    uuid,
  dedupe_key   text unique,
  sent_at      timestamptz not null default now(),
  ok           boolean not null default true,
  error        text
);

-- ---------- updated_at automático ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger leads_updated    before update on leads       for each row execute function set_updated_at();
create trigger bookings_updated before update on bookings    for each row execute function set_updated_at();
create trigger deals_updated    before update on deals       for each row execute function set_updated_at();
create trigger eod_updated      before update on eod_reports for each row execute function set_updated_at();

-- ---------- Semilla de programas ----------
insert into programs (name, duration_months, duration_days, sort_order) values
  ('SSS Lite',     4,  120, 1),
  ('SSS Core',     6,  180, 2),
  ('MasterMind',  12,  365, 3),
  ('Inner Circle',12,  365, 4);
