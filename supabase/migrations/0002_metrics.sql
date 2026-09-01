-- ============================================================
-- Vistas de métricas.
-- La tabla "KPI Closer" de Airtable estaba vacía porque había que
-- rellenarla a mano. Aquí sale calculada de las agendas y los cierres.
-- ============================================================

-- Cash collected real por día: cuotas efectivamente cobradas.
create or replace view v_cash_by_day as
select p.paid_at as metric_date,
       sum(p.amount) as cash,
       count(distinct p.deal_id) as deals_touched
from payments p
join deals d on d.id = p.deal_id
where p.status = 'cobrado' and p.paid_at is not null and d.status = 'cerrado'
group by 1;

-- Valor contratado por día (lo firmado, cobrado o no).
create or replace view v_contracted_by_day as
select closed_at as metric_date,
       sum(ticket) as contracted,
       count(*) as deals
from deals
where status = 'cerrado'
group by 1;

-- Gasto publicitario por día (API de Meta + entradas manuales).
create or replace view v_ad_spend_by_day as
select metric_date, sum(spend) as spend
from (
  select metric_date, spend from ads_daily_metrics
  union all
  select spend_date, amount from ad_spend_manual
) s
group by 1;

-- ---------- KPI Setter ----------
-- Cruza lo que el setter declara en el EOD con las agendas reales
-- que llegaron por el webhook de Calendly. La diferencia entre
-- calls_booked_declared y bookings_real es la señal de que algo falla.
create or replace view v_setter_daily as
select
  coalesce(e.setter_id, b.setter_id)              as setter_id,
  coalesce(e.report_date, b.day)                  as metric_date,
  coalesce(e.inbound_conversations, 0)            as inbound_conversations,
  coalesce(e.inbound_replies, 0)                  as inbound_replies,
  e.inbound_reply_rate,
  coalesce(e.outbound_conversations, 0)           as outbound_conversations,
  coalesce(e.outbound_replies, 0)                 as outbound_replies,
  e.outbound_reply_rate,
  coalesce(e.total_conversations, 0)              as total_conversations,
  coalesce(e.calendly_links_sent, 0)              as calendly_links_sent,
  coalesce(e.calls_booked, 0)                     as calls_booked_declared,
  coalesce(b.bookings, 0)                         as bookings_real,
  e.booking_rate                                  as booking_rate_declared,
  -- Tasa de agenda real: agendas de Calendly sobre conversaciones del EOD
  round(coalesce(b.bookings, 0)::numeric
        / nullif(e.total_conversations, 0), 4)    as booking_rate_real,
  coalesce(e.follow_ups, 0)                       as follow_ups,
  coalesce(e.follow_up_replies, 0)                as follow_up_replies,
  e.follow_up_reply_rate,
  e.mood,
  e.trained
from eod_reports e
full outer join (
  select setter_id,
         (booked_at at time zone 'Europe/Madrid')::date as day,
         count(*) as bookings
  from bookings
  where setter_id is not null
  group by 1, 2
) b on b.setter_id = e.setter_id and b.day = e.report_date;

-- ---------- KPI Closer ----------
create or replace view v_closer_daily as
with calls as (
  select
    b.id,
    b.closer_id,
    (b.scheduled_at at time zone 'Europe/Madrid')::date as metric_date,
    b.status,
    b.closing_status
  from bookings b
  where b.closer_id is not null
)
select
  c.closer_id,
  c.metric_date,
  count(*)                                                   as calls_scheduled,
  count(*) filter (where c.status = 'cancelada')             as calls_canceled,
  count(*) filter (where c.status = 'no_show')               as no_shows,
  count(*) filter (where c.status = 'completada')            as calls_held,
  count(*) filter (where c.closing_status = 'no_califica')   as disqualified,
  count(*) filter (where c.status = 'completada'
                     and c.closing_status <> 'no_califica')  as qualified,
  count(*) filter (where c.closing_status = 'seguimiento')   as follow_ups,
  count(d.id)                                                as closes,
  count(d.id) filter (where d.payment_kind = 'full_pay')     as closes_full,
  count(d.id) filter (where d.payment_kind <> 'full_pay')    as closes_installments,
  coalesce(sum(d.ticket), 0)                                 as contracted,

  round(count(*) filter (where c.status = 'no_show')::numeric
        / nullif(count(*), 0), 4)                            as no_show_rate,
  -- % de cierre sobre llamadas celebradas y cualificadas
  round(count(d.id)::numeric
        / nullif(count(*) filter (where c.status = 'completada'
                                    and c.closing_status <> 'no_califica'), 0), 4)
                                                             as close_rate,
  round(count(d.id) filter (where d.payment_kind = 'full_pay')::numeric
        / nullif(count(d.id), 0), 4)                         as full_pay_share
from calls c
left join deals d on d.booking_id = c.id and d.status = 'cerrado'
group by 1, 2;

-- ---------- Resumen diario global ----------
create or replace view v_daily_overview as
with d as (
  select metric_date from v_ad_spend_by_day
  union select metric_date from v_cash_by_day
  union select metric_date from v_contracted_by_day
  union select metric_date from ig_daily_metrics
  union select (booked_at at time zone 'Europe/Madrid')::date from bookings
)
select
  d.metric_date,
  coalesce(s.spend, 0)                                       as ad_spend,
  coalesce(c.cash, 0)                                        as cash_collected,
  coalesce(ct.contracted, 0)                                 as contracted,
  coalesce(ct.deals, 0)                                      as closes,
  coalesce(bk.bookings, 0)                                   as bookings,
  ig.follows_delta                                           as new_followers,
  ig.followers_count                                         as followers_total,
  -- ROAS sobre cash realmente cobrado
  round(coalesce(c.cash, 0) / nullif(s.spend, 0), 2)         as roas,
  -- ROAS sobre valor contratado (más optimista, útil para comparar)
  round(coalesce(ct.contracted, 0) / nullif(s.spend, 0), 2)  as roas_contracted,
  round(coalesce(s.spend, 0) / nullif(ig.follows_delta, 0), 2) as cost_per_follower,
  round(coalesce(s.spend, 0) / nullif(bk.bookings, 0), 2)      as cost_per_booking,
  round(coalesce(s.spend, 0) / nullif(ct.deals, 0), 2)         as cost_per_close
from d
left join v_ad_spend_by_day   s  on s.metric_date  = d.metric_date
left join v_cash_by_day       c  on c.metric_date  = d.metric_date
left join v_contracted_by_day ct on ct.metric_date = d.metric_date
left join ig_daily_metrics    ig on ig.metric_date = d.metric_date
left join (
  select (booked_at at time zone 'Europe/Madrid')::date as metric_date, count(*) as bookings
  from bookings group by 1
) bk on bk.metric_date = d.metric_date;

-- ---------- Rendimiento por anuncio (boosted posts) ----------
-- 'follows' solo llega si Meta lo reporta para ese anuncio. Cuando no,
-- el dato honesto es el coste por visita al perfil, que sí es real.
create or replace view v_ad_performance as
select
  a.ad_id,
  a.ad_name,
  a.campaign_name,
  a.instagram_permalink,
  sum(m.spend)          as spend,
  sum(m.impressions)    as impressions,
  sum(m.reach)          as reach,
  sum(m.clicks)         as clicks,
  sum(m.profile_visits) as profile_visits,
  sum(m.follows)        as follows,
  round(sum(m.spend) / nullif(sum(m.follows), 0), 2)         as cost_per_follower,
  round(sum(m.spend) / nullif(sum(m.profile_visits), 0), 2)  as cost_per_profile_visit,
  round(sum(m.spend) / nullif(sum(m.reach), 0) * 1000, 2)    as cpm
from ads a
join ads_daily_metrics m on m.ad_id = a.ad_id
group by 1, 2, 3, 4;

-- ---------- Rendimiento por programa ----------
create or replace view v_program_performance as
select
  p.name                                                  as program,
  count(d.id)                                             as closes,
  coalesce(sum(d.ticket), 0)                              as contracted,
  coalesce(sum(paid.cash), 0)                             as cash_collected,
  round(avg(d.ticket), 2)                                 as avg_ticket
from programs p
left join deals d on d.program_id = p.id and d.status = 'cerrado'
left join lateral (
  select sum(amount) as cash from payments
  where deal_id = d.id and status = 'cobrado'
) paid on true
group by 1;
