-- ============================================================
-- Row Level Security
-- Regla general: el CRM es interno. Todo el equipo autenticado
-- puede leer; escribir esta acotado por rol. Los webhooks y los
-- crons entran con service_role, que salta RLS.
-- ============================================================

alter table team_members      enable row level security;
alter table leads             enable row level security;
alter table bookings          enable row level security;
alter table deals             enable row level security;
alter table payments          enable row level security;
alter table eod_reports       enable row level security;
alter table ig_daily_metrics  enable row level security;
alter table ads               enable row level security;
alter table ads_daily_metrics enable row level security;
alter table ad_spend_manual   enable row level security;
alter table notification_log  enable row level security;

-- Helpers
create or replace function current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from team_members where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function current_member_role() returns member_role
language sql stable security definer set search_path = public as $$
  select role from team_members where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where auth_user_id = auth.uid() and active);
$$;

create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from team_members
    where auth_user_id = auth.uid() and active and role in ('admin','manager')
  );
$$;

-- Lectura: todo el equipo activo
create policy staff_read on team_members      for select to authenticated using (is_staff());
create policy staff_read on leads             for select to authenticated using (is_staff());
create policy staff_read on bookings          for select to authenticated using (is_staff());
create policy staff_read on deals             for select to authenticated using (is_staff());
create policy staff_read on payments          for select to authenticated using (is_staff());
create policy staff_read on eod_reports       for select to authenticated using (is_staff());
create policy staff_read on ig_daily_metrics  for select to authenticated using (is_staff());
create policy staff_read on ads               for select to authenticated using (is_staff());
create policy staff_read on ads_daily_metrics for select to authenticated using (is_staff());
create policy staff_read on ad_spend_manual   for select to authenticated using (is_staff());
create policy staff_read on notification_log  for select to authenticated using (is_manager());

-- Leads: cualquiera del equipo crea y edita
create policy staff_write on leads for insert to authenticated with check (is_staff());
create policy staff_edit   on leads for update to authenticated using (is_staff()) with check (is_staff());

-- Agendas: se editan (marcar no-show, reasignar) por el equipo
create policy staff_edit on bookings for update to authenticated using (is_staff()) with check (is_staff());
create policy staff_write on bookings for insert to authenticated with check (is_staff());

-- Cierres: los sube el equipo; solo manager los borra o cambia de estado a reembolsado
create policy staff_write on deals for insert to authenticated with check (is_staff());
create policy owner_edit  on deals for update to authenticated
  using (is_manager() or closer_id = current_member_id() or created_by = current_member_id())
  with check (is_manager() or closer_id = current_member_id() or created_by = current_member_id());
create policy manager_del on deals for delete to authenticated using (is_manager());

create policy staff_write on payments for insert to authenticated with check (is_staff());
create policy staff_edit  on payments for update to authenticated using (is_staff()) with check (is_staff());

-- EOD: cada setter solo escribe el suyo; los managers ven y editan todo
create policy own_write on eod_reports for insert to authenticated
  with check (setter_id = current_member_id() or is_manager());
create policy own_edit on eod_reports for update to authenticated
  using (setter_id = current_member_id() or is_manager())
  with check (setter_id = current_member_id() or is_manager());

-- Gasto manual: solo managers
create policy manager_write on ad_spend_manual for insert to authenticated with check (is_manager());
create policy manager_edit  on ad_spend_manual for update to authenticated using (is_manager()) with check (is_manager());
create policy manager_del   on ad_spend_manual for delete to authenticated using (is_manager());

-- Equipo: solo admin/manager modifica la plantilla
create policy manager_write on team_members for insert to authenticated with check (is_manager());
create policy manager_edit  on team_members for update to authenticated using (is_manager()) with check (is_manager());
