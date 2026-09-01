import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { fetchAdInsights } from "@/lib/integrations/meta";
import { assertCronRequest, syncWindow } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = assertCronRequest(req);
  if (denied) return denied;

  const { since, until } = syncWindow(7);

  try {
    const { ads, daily } = await fetchAdInsights(since, until);
    const db = serviceClient();

    // Los anuncios primero: `ads_daily_metrics` tiene clave foránea sobre ellos.
    if (ads.length) {
      const { error } = await db
        .from("ads")
        .upsert(ads.map((a) => ({ ...a, synced_at: new Date().toISOString() })), { onConflict: "ad_id" });
      if (error) throw error;
    }

    if (daily.length) {
      const { error } = await db.from("ads_daily_metrics").upsert(
        daily.map((d) => ({ ...d, raw: d.raw as Record<string, unknown>, synced_at: new Date().toISOString() })),
        { onConflict: "metric_date,ad_id" },
      );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, ads: ads.length, rows: daily.length, since, until });
  } catch (err) {
    console.error("[cron/meta-ads]", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
