-- ============================================================
-- CRM Dashboard — esquema inicial
-- Sustituye la base de Airtable: agendas (Calendly), cierres,
-- EOD de setters, métricas de Instagram y de Meta Ads.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
create type member_role   as enum ('admin', 'manager', 'setter', 'closer');
create type lead_status   as enum ('nuevo', 'contactado', 'agendado', 'no_show', 'cerrado', 'perdido');
create type booking_status as enum ('agendada', 'completada', 'no_show', 'cancelada', 'reagendada');
create type deal_status   as enum ('cerrado', 'reembolsado', 'impagado', 'cancelado');
create type payment_status as enum ('pendiente', 'cobrado', 'fallido', 'reembolsado');

-- ---------- Equipo ----------
create table team_members (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique,                       -- referencia a auth.users
  full_name         text not null,
  email             text unique not null,
  role              member_role not null default 'setter',
  -- Mapeo con sistemas externos
  calendly_user_uri text unique,                       -- para asignar el closer anfitrión
  slack_user_id     text,
  instagram_handle  text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ---------- Leads / contactos ----------
create table leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text,
  email             text,
  phone             text,
  instagram_handle  text,
  source            text,                              -- instagram_dm, ad, organico, referido, manual
  setter_id         uuid references team_members(id) on delete set null,
  status            lead_status not null default 'nuevo',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index leads_email_uniq on leads (lower(email)) where email is not null;
create index leads_ig_idx     on leads (lower(instagram_handle));
create index leads_setter_idx on leads (setter_id);

-- ---------- Agendas (Calendly) ----------
create table bookings (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid references leads(id) on delete set null,
  closer_id            uuid references team_members(id) on delete set null,
  setter_id            uuid references team_members(id) on delete set null,

  calendly_event_uri   text unique,                    -- idempotencia del webhook
  calendly_invitee_uri text unique,
  event_type_name      text,

  scheduled_at         timestamptz not null,           -- cuándo es la llamada
  booked_at            timestamptz not null default now(), -- cuándo se agendó
  timezone             text,

  status               booking_status not null default 'agendada',
  cancel_reason        text,
  canceled_at          timestamptz,

  -- Atribución
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  utm_term             text,

  invitee_name         text,
  invitee_email        text,
  answers              jsonb not null default '{}'::jsonb,  -- respuestas del formulario de Calendly
  raw_payload          jsonb,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index bookings_scheduled_idx on bookings (scheduled_at desc);
create index bookings_booked_idx    on bookings (booked_at desc);
create index bookings_setter_idx    on bookings (setter_id, booked_at desc);
create index bookings_closer_idx    on bookings (closer_id, scheduled_at desc);
create index bookings_status_idx    on bookings (status);

-- ---------- Cierres ----------
create table deals (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid references bookings(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  closer_id       uuid references team_members(id) on delete set null,
  setter_id       uuid references team_members(id) on delete set null,

  closed_at       date not null default current_date,
  product         text,
  contract_value  numeric(12,2) not null default 0,    -- valor total del contrato
  cash_collected  numeric(12,2) not null default 0,    -- cobrado en el momento del cierre
  currency        text not null default 'EUR',
  payment_plan    text,                                -- "1 pago", "3 cuotas", ...
  installments    int  not null default 1,

  status          deal_status not null default 'cerrado',
  notes           text,
  created_by      uuid references team_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint deals_cash_lte_contract check (cash_collected <= contract_value + 0.01)
);
create index deals_closed_idx on deals (closed_at desc);
create index deals_closer_idx on deals (closer_id, closed_at desc);
create index deals_setter_idx on deals (setter_id, closed_at desc);

-- ---------- Cobros (cuotas / cash collected en el tiempo) ----------
create table payments (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  amount      numeric(12,2) not null,
  due_on      date,
  paid_at     date,
  method      text,
  status      payment_status not null default 'pendiente',
  created_at  timestamptz not null default now()
);
create index payments_deal_idx on payments (deal_id);
create index payments_paid_idx on payments (paid_at) where paid_at is not null;

-- ---------- EOD de setters ----------
create table eod_reports (
  id                    uuid primary key default gen_random_uuid(),
  setter_id             uuid not null references team_members(id) on delete cascade,
  report_date           date not null default current_date,

  dms_sent              int not null default 0,   -- DMs enviados
  conversations_started int not null default 0,   -- conversaciones abiertas
  follow_ups            int not null default 0,
  calls_booked          int not null default 0,   -- agendas declaradas por el setter
  stories_posted        int not null default 0,
  hours_worked          numeric(4,1),

  wins                  text,
  blockers              text,
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (setter_id, report_date)
);
create index eod_date_idx on eod_reports (report_date desc);

-- ---------- Métricas diarias de Instagram ----------
create table ig_daily_metrics (
  metric_date       date primary key,
  followers_count   int,          -- total de seguidores al cierre del día
  follows_delta     int,          -- nuevos seguidores del día (follower_count de IG)
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
  ad_id              text primary key,
  ad_name            text,
  adset_id           text,
  adset_name         text,
  campaign_id        text,
  campaign_name      text,
  objective          text,
  effective_status   text,
  instagram_permalink text,       -- el post promocionado
  created_time       timestamptz,
  synced_at          timestamptz not null default now()
);

create table ads_daily_metrics (
  metric_date    date not null,
  ad_id          text not null references ads(ad_id) on delete cascade,
  spend          numeric(12,2) not null default 0,
  impressions    int not null default 0,
  reach          int not null default 0,
  clicks         int not null default 0,
  profile_visits int not null default 0,
  follows        int not null default 0,     -- si Meta lo reporta para el anuncio
  currency       text not null default 'EUR',
  raw            jsonb,
  synced_at      timestamptz not null default now(),
  primary key (metric_date, ad_id)
);
create index ads_daily_date_idx on ads_daily_metrics (metric_date desc);

-- ---------- Gasto publicitario manual (fallback si la API no cubre algo) ----------
create table ad_spend_manual (
  id           uuid primary key default gen_random_uuid(),
  spend_date   date not null,
  amount       numeric(12,2) not null,
  platform     text not null default 'instagram',
  label        text,
  created_at   timestamptz not null default now()
);

-- ---------- Log de notificaciones (idempotencia de Slack) ----------
create table notification_log (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null,
  kind         text not null,              -- 'agenda' | 'cierre' | ...
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

create trigger leads_updated       before update on leads       for each row execute function set_updated_at();
create trigger bookings_updated    before update on bookings    for each row execute function set_updated_at();
create trigger deals_updated       before update on deals       for each row execute function set_updated_at();
create trigger eod_updated         before update on eod_reports for each row execute function set_updated_at();
