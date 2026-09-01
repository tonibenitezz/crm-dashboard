import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { fetchFollowersTotal, fetchInstagramDaily } from "@/lib/integrations/meta";
import { assertCronRequest, syncWindow } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = assertCronRequest(req);
  if (denied) return denied;

  const { since, until } = syncWindow(7);

  try {
    const [days, followersTotal] = await Promise.all([
      fetchInstagramDaily(since, until),
      fetchFollowersTotal(),
    ]);

    const db = serviceClient();
    const today = new Date().toISOString().slice(0, 10);

    const rows = days.map((d) => ({
      metric_date: d.metric_date,
      follows_delta: d.follows_delta,
      reach: d.reach,
      impressions: d.impressions,
      profile_views: d.profile_views,
      website_clicks: d.website_clicks,
      // El total solo se conoce hoy; los días pasados conservan el suyo.
      ...(d.metric_date === today ? { followers_count: followersTotal } : {}),
      raw: d.raw as Record<string, unknown>,
      synced_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error } = await db.from("ig_daily_metrics").upsert(rows, { onConflict: "metric_date" });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, days: rows.length, followersTotal, since, until });
  } catch (err) {
    console.error("[cron/instagram]", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
