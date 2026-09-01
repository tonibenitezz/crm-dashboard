import { createServerSupabase } from "@/lib/supabase/server";

export type DailyOverview = {
  metric_date: string;
  ad_spend: number;
  cash_collected: number;
  contracted: number;
  closes: number;
  bookings: number;
  new_followers: number | null;
  followers_total: number | null;
  roas: number | null;
  roas_contracted: number | null;
  cost_per_follower: number | null;
  cost_per_booking: number | null;
  cost_per_close: number | null;
};

export type Totals = {
  cash: number;
  contracted: number;
  spend: number;
  bookings: number;
  closes: number;
  newFollowers: number;
  roas: number | null;
  costPerBooking: number | null;
  costPerClose: number | null;
  costPerFollower: number | null;
};

/** Suma un rango de `v_daily_overview`. Las tasas se recalculan sobre los
 *  totales: promediar ratios diarios da un número distinto y equivocado. */
export function sumOverview(rows: DailyOverview[]): Totals {
  const t = rows.reduce(
    (acc, r) => ({
      cash: acc.cash + Number(r.cash_collected ?? 0),
      contracted: acc.contracted + Number(r.contracted ?? 0),
      spend: acc.spend + Number(r.ad_spend ?? 0),
      bookings: acc.bookings + Number(r.bookings ?? 0),
      closes: acc.closes + Number(r.closes ?? 0),
      newFollowers: acc.newFollowers + Number(r.new_followers ?? 0),
    }),
    { cash: 0, contracted: 0, spend: 0, bookings: 0, closes: 0, newFollowers: 0 },
  );

  const per = (n: number, d: number) => (d > 0 ? n / d : null);
  return {
    ...t,
    roas: per(t.cash, t.spend),
    costPerBooking: per(t.spend, t.bookings),
    costPerClose: per(t.spend, t.closes),
    costPerFollower: per(t.spend, t.newFollowers),
  };
}

export async function getOverview(from: string, to: string): Promise<DailyOverview[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("v_daily_overview")
    .select("*")
    .gte("metric_date", from)
    .lte("metric_date", to)
    .order("metric_date");
  if (error) throw error;
  return (data ?? []) as DailyOverview[];
}

/** Rellena los días sin fila para que la serie no dé saltos engañosos. */
export function fillGaps(rows: DailyOverview[], from: string, to: string): DailyOverview[] {
  const byDate = new Map(rows.map((r) => [r.metric_date, r]));
  const out: DailyOverview[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    out.push(
      byDate.get(key) ?? {
        metric_date: key, ad_spend: 0, cash_collected: 0, contracted: 0,
        closes: 0, bookings: 0, new_followers: null, followers_total: null,
        roas: null, roas_contracted: null, cost_per_follower: null,
        cost_per_booking: null, cost_per_close: null,
      },
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export type SetterRow = {
  setter_id: string;
  full_name: string;
  bookings: number;
  conversations: number;
  bookingRate: number | null;
};

export async function getSetterLeaderboard(from: string, to: string): Promise<SetterRow[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("v_setter_daily")
    .select("setter_id, total_conversations, bookings_real")
    .gte("metric_date", from)
    .lte("metric_date", to);
  if (error) throw error;

  const { data: members } = await db.from("team_members").select("id, full_name");
  const names = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  const acc = new Map<string, { bookings: number; conversations: number }>();
  for (const row of data ?? []) {
    if (!row.setter_id) continue;
    const cur = acc.get(row.setter_id) ?? { bookings: 0, conversations: 0 };
    cur.bookings += Number(row.bookings_real ?? 0);
    cur.conversations += Number(row.total_conversations ?? 0);
    acc.set(row.setter_id, cur);
  }

  return [...acc.entries()]
    .map(([setter_id, v]) => ({
      setter_id,
      full_name: names.get(setter_id) ?? "Sin asignar",
      bookings: v.bookings,
      conversations: v.conversations,
      bookingRate: v.conversations > 0 ? v.bookings / v.conversations : null,
    }))
    .sort((a, b) => b.bookings - a.bookings);
}

export type CloserRow = {
  closer_id: string;
  full_name: string;
  calls: number;
  held: number;
  noShows: number;
  closes: number;
  contracted: number;
  closeRate: number | null;
};

export async function getCloserLeaderboard(from: string, to: string): Promise<CloserRow[]> {
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("v_closer_daily")
    .select("closer_id, calls_scheduled, calls_held, no_shows, qualified, closes, contracted")
    .gte("metric_date", from)
    .lte("metric_date", to);
  if (error) throw error;

  const { data: members } = await db.from("team_members").select("id, full_name");
  const names = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  const acc = new Map<string, { calls: number; held: number; noShows: number; qualified: number; closes: number; contracted: number }>();
  for (const row of data ?? []) {
    if (!row.closer_id) continue;
    const cur = acc.get(row.closer_id) ?? { calls: 0, held: 0, noShows: 0, qualified: 0, closes: 0, contracted: 0 };
    cur.calls += Number(row.calls_scheduled ?? 0);
    cur.held += Number(row.calls_held ?? 0);
    cur.noShows += Number(row.no_shows ?? 0);
    cur.qualified += Number(row.qualified ?? 0);
    cur.closes += Number(row.closes ?? 0);
    cur.contracted += Number(row.contracted ?? 0);
    acc.set(row.closer_id, cur);
  }

  return [...acc.entries()]
    .map(([closer_id, v]) => ({
      closer_id,
      full_name: names.get(closer_id) ?? "Sin asignar",
      calls: v.calls,
      held: v.held,
      noShows: v.noShows,
      closes: v.closes,
      contracted: v.contracted,
      closeRate: v.qualified > 0 ? v.closes / v.qualified : null,
    }))
    .sort((a, b) => b.contracted - a.contracted);
}
