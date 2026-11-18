-- ============================================================
-- Quiz funnel: cada envío del quiz con sus respuestas y el plan
-- que genera la IA. El lead se enlaza con `leads` por email, así
-- que cuando agenda por Calendly su agenda cae en la misma ficha.
-- ============================================================

create type quiz_status as enum ('generando', 'listo', 'error');

create table quiz_submissions (
  id            uuid primary key default gen_random_uuid(),
  funnel        text not null,                       -- slug del quiz (scaled, cliente-x…)
  lead_id       uuid references leads(id) on delete set null,

  full_name     text not null,
  email         text not null,
  phone         text,
  instagram_handle text,

  answers       jsonb not null default '{}'::jsonb,

  status        quiz_status not null default 'generando',
  plan          jsonb,                               -- plan completo (incluye el bloque interno)
  model         text,
  error         text,

  -- Seguimiento comercial
  contacted_at  timestamptz,
  notes         text,

  -- Atribución
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index quiz_created_idx on quiz_submissions (created_at desc);
create index quiz_email_idx   on quiz_submissions (lower(email), created_at desc);
create index quiz_lead_idx    on quiz_submissions (lead_id);

create trigger quiz_updated before update on quiz_submissions
  for each row execute function set_updated_at();

-- El quiz es público, pero escribe el servidor con service_role (salta RLS).
-- El equipo lee y marca como contactado desde el CRM.
alter table quiz_submissions enable row level security;
create policy staff_read on quiz_submissions for select to authenticated using (is_staff());
create policy staff_edit on quiz_submissions for update to authenticated
  using (is_staff()) with check (is_staff());
