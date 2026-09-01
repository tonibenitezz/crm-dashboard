-- ============================================================
-- Vistas de métricas: todo lo que el dashboard calcula solo.
-- ============================================================

-- Cash collected real por día (cierre inicial + cuotas cobradas)
create or replace view v_cash_by_day as
select d.closed_at as metric_date,
       sum(d.cash_collected) as cash,
       sum(d.contract_value) as contracted,
       count(*) as deals
from deals d
where d.status = 'cerrado'
group by 1
union all
select p.paid_at, sum(p.amount), 0, 0
from payments p
where p.status = 'cobrado' and p.paid_at is not null
group by 1;

-- Gasto publicitario por día (API de Meta + manual)
create or replace view v_ad_spend_by_day as
select metric_date, sum(spend) as spend
from (
  select metric_date, spend from ads_daily_metrics
  union all
  select spend_date, amount from ad_spend_manual
) s
group by 1;

-- Rendimiento diario del setter: EOD declarado vs agendas reales de Calendly
create or replace view v_setter_daily as
select
  coalesce(e.setter_id, b.setter_id)                        as setter_id,
  coalesce(e.report_date, b.day)                            as metric_date,
  coalesce(e.dms_sent, 0)                                   as dms_sent,
  coalesce(e.conversations_started, 0)                      as conversations,
  coalesce(e.follow_ups, 0)                                 as follow_ups,
  coalesce(e.calls_booked, 0)                               as calls_booked_declared,
  coalesce(b.bookings, 0)                                   as bookings_real,
  -- Tasa de agenda = agendas reales / conversaciones abiertas
  case when coalesce(e.conversations_started, 0) > 0
       then round(coalesce(b.bookings, 0)::numeric / e.conversations_started, 4)
  end                                                        as booking_rate
from eod_reports e
full outer join (
  select setter_id, (booked_at at time zone 'Europe/Madrid')::date as day, count(*) as bookings
  from bookings
  where setter_id is not null
  group by 1, 2
) b on b.setter_id = e.setter_id and b.day = e.report_date;

-- Embudo del closer: agendas -> celebradas -> cerradas
create or replace view v_closer_daily as
select
  b.closer_id,
  (b.scheduled_at at time zone 'Europe/Madrid')::date        as metric_date,
  count(*)                                                    as calls_scheduled,
  count(*) filter (where b.status = 'completada')             as calls_held,
  count(*) filter (where b.status = 'no_show')                as no_shows,
  count(d.id)                                                 as closes,
  coalesce(sum(d.cash_collected), 0)                          as cash,
  case when count(*) filter (where b.status = 'completada') > 0
       then round(count(d.id)::numeric
                  / count(*) filter (where b.status = 'completada'), 4)
  end                                                          as close_rate
from bookings b
left join deals d on d.booking_id = b.id and d.status = 'cerrado'
where b.closer_id is not null
group by 1, 2;

-- Resumen diario global: ROAS, coste por seguidor, coste por agenda
create or replace view v_daily_overview as
with spend as (select metric_date, spend from v_ad_spend_by_day),
     cash  as (select metric_date, sum(cash) as cash from v_cash_by_day group by 1),
     bk    as (select (booked_at at time zone 'Europe/Madrid')::date as metric_date,
                      count(*) as bookings
               from bookings group by 1),
     ig    as (select metric_date, follows_delta, followers_count from ig_daily_metrics)
select
  coalesce(spend.metric_date, cash.metric_date, bk.metric_date, ig.metric_date) as metric_date,
  coalesce(spend.spend, 0)            as ad_spend,
  coalesce(cash.cash, 0)              as cash_collected,
  coalesce(bk.bookings, 0)            as bookings,
  ig.follows_delta                    as new_followers,
  ig.followers_count                  as followers_total,
  -- ROAS = cash cobrado / gasto publicitario
  case when coalesce(spend.spend, 0) > 0
       then round(coalesce(cash.cash, 0) / spend.spend, 2) end  as roas,
  -- Coste por seguidor
  case when coalesce(ig.follows_delta, 0) > 0
       then round(coalesce(spend.spend, 0) / ig.follows_delta, 2) end as cost_per_follower,
  -- Coste por agenda
  case when coalesce(bk.bookings, 0) > 0
       then round(coalesce(spend.spend, 0) / bk.bookings, 2) end as cost_per_booking
from spend
full outer join cash  on cash.metric_date  = spend.metric_date
full outer join bk    on bk.metric_date    = coalesce(spend.metric_date, cash.metric_date)
full outer join ig    on ig.metric_date    = coalesce(spend.metric_date, cash.metric_date, bk.metric_date);

-- Coste por seguidor por anuncio concreto (boosted posts)
-- Nota: 'follows' solo existe si Meta lo reporta para ese anuncio;
-- si no, se usa el reparto proporcional del gasto sobre los follows del dia.
create or replace view v_ad_performance as
select
  a.ad_id,
  a.ad_name,
  a.campaign_name,
  a.instagram_permalink,
  sum(m.spend)        as spend,
  sum(m.impressions)  as impressions,
  sum(m.reach)        as reach,
  sum(m.clicks)       as clicks,
  sum(m.profile_visits) as profile_visits,
  sum(m.follows)      as follows,
  case when sum(m.follows) > 0
       then round(sum(m.spend) / sum(m.follows), 2) end as cost_per_follower,
  case when sum(m.profile_visits) > 0
       then round(sum(m.spend) / sum(m.profile_visits), 2) end as cost_per_profile_visit
from ads a
join ads_daily_metrics m on m.ad_id = a.ad_id
group by 1, 2, 3, 4;
