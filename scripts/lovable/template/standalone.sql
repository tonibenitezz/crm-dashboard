-- Úsalo SOLO si el proyecto de Lovable tiene un Supabase nuevo, sin las tablas del CRM.
-- Crea una tabla de leads mínima y la del quiz. Si usas el Supabase del CRM, usa el archivo 1.

create extension if not exists "pgcrypto";

create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text,
  email             text,
  phone             text,
  whatsapp_url      text,
  instagram_handle  text,
  current_revenue   text,
  source            text,
  status            text not null default 'nuevo',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists leads_email_uniq on leads (lower(email)) where email is not null;

create table if not exists quiz_submissions (
  id            uuid primary key default gen_random_uuid(),
  funnel        text not null,
  lead_id       uuid references leads(id) on delete set null,
  full_name     text not null,
  email         text not null,
  phone         text,
  instagram_handle text,
  answers       jsonb not null default '{}'::jsonb,
  status        text not null default 'generando',   -- generando | listo | error
  plan          jsonb,
  model         text,
  error         text,
  contacted_at  timestamptz,
  notes         text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists quiz_created_idx on quiz_submissions (created_at desc);
create index if not exists quiz_email_idx   on quiz_submissions (lower(email), created_at desc);

-- Nadie lee ni escribe desde el navegador: solo la función, con service_role.
alter table leads            enable row level security;
alter table quiz_submissions enable row level security;
