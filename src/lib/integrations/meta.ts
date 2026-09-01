/**
 * Cliente de la Graph API de Meta: métricas de Instagram y gasto de los
 * anuncios (los boosted posts creados desde la app de IG incluidos).
 *
 * Todo lo que devuelve Meta se guarda también en crudo (`raw`): si mañana
 * hace falta una métrica que hoy no leemos, está en la base de datos.
 */

const API = "https://graph.facebook.com";

function version() {
  return process.env.META_API_VERSION ?? "v21.0";
}

function token() {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("Falta META_ACCESS_TOKEN");
  return t;
}

type MetaError = { error?: { message: string; type: string; code: number } };

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${version()}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token());

  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json()) as T & MetaError;

  if (body.error) {
    throw new Error(`Meta ${body.error.code} (${body.error.type}): ${body.error.message}`);
  }
  if (!res.ok) throw new Error(`Meta respondió ${res.status}`);
  return body;
}

// ------------------------------------------------------------ Instagram

export type IgDaily = {
  metric_date: string;
  follows_delta: number | null;
  reach: number | null;
  impressions: number | null;
  profile_views: number | null;
  website_clicks: number | null;
  raw: unknown;
};

type InsightSeries = {
  data: { name: string; period: string; values: { value: number; end_time: string }[] }[];
};

/**
 * Serie diaria de la cuenta. `follower_count` solo devuelve los últimos
 * 30 días, así que este cron es la única forma de tener histórico propio:
 * lo anterior a la puesta en marcha no se puede recuperar.
 */
export async function fetchInstagramDaily(since: string, until: string): Promise<IgDaily[]> {
  const igUser = process.env.META_IG_USER_ID;
  if (!igUser) throw new Error("Falta META_IG_USER_ID");

  // Se piden por separado porque un solo `metric` inválido tumba la llamada
  // entera, y las métricas disponibles cambian entre versiones de la API.
  const metrics = ["follower_count", "reach", "impressions", "profile_views", "website_clicks"];
  const series = new Map<string, Map<string, number>>();
  const raw: Record<string, unknown> = {};

  for (const metric of metrics) {
    try {
      const res = await graph<InsightSeries>(`${igUser}/insights`, {
        metric, period: "day", since, until,
      });
      raw[metric] = res.data;
      for (const item of res.data ?? []) {
        for (const point of item.values ?? []) {
          // Meta marca cada punto con el FIN del día, así que el dato
          // corresponde a la jornada anterior.
          const day = new Date(point.end_time);
          day.setUTCDate(day.getUTCDate() - 1);
          const key = day.toISOString().slice(0, 10);
          if (!series.has(key)) series.set(key, new Map());
          series.get(key)!.set(metric, point.value);
        }
      }
    } catch (err) {
      // Una métrica retirada no debe impedir guardar el resto.
      raw[`${metric}_error`] = String(err);
      console.warn(`[meta] métrica de IG no disponible: ${metric}`, err);
    }
  }

  return [...series.entries()]
    .map(([metric_date, values]) => ({
      metric_date,
      follows_delta: values.get("follower_count") ?? null,
      reach: values.get("reach") ?? null,
      impressions: values.get("impressions") ?? null,
      profile_views: values.get("profile_views") ?? null,
      website_clicks: values.get("website_clicks") ?? null,
      raw: raw,
    }))
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date));
}

/** Total de seguidores ahora mismo (la serie diaria solo da el incremento). */
export async function fetchFollowersTotal(): Promise<number | null> {
  const igUser = process.env.META_IG_USER_ID;
  if (!igUser) return null;
  const res = await graph<{ followers_count?: number }>(igUser, { fields: "followers_count" });
  return res.followers_count ?? null;
}

// ------------------------------------------------------------ Meta Ads

export type AdRow = {
  ad_id: string;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  objective: string | null;
};

export type AdDailyRow = {
  metric_date: string;
  ad_id: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  profile_visits: number;
  follows: number;
  currency: string;
  raw: unknown;
};

type InsightsResponse = {
  data: {
    ad_id: string; ad_name?: string;
    adset_id?: string; adset_name?: string;
    campaign_id?: string; campaign_name?: string;
    objective?: string;
    date_start: string;
    spend?: string; impressions?: string; reach?: string; clicks?: string;
    account_currency?: string;
    actions?: { action_type: string; value: string }[];
  }[];
  paging?: { next?: string };
};

/** Suma las acciones cuyo tipo encaja con el patrón. Meta nombra lo mismo
 *  de formas distintas según el objetivo del anuncio. */
function sumActions(actions: { action_type: string; value: string }[] = [], pattern: RegExp) {
  return actions
    .filter((a) => pattern.test(a.action_type))
    .reduce((sum, a) => sum + Number(a.value ?? 0), 0);
}

export async function fetchAdInsights(
  since: string,
  until: string,
): Promise<{ ads: AdRow[]; daily: AdDailyRow[] }> {
  const account = process.env.META_AD_ACCOUNT_ID;
  if (!account) throw new Error("Falta META_AD_ACCOUNT_ID");

  const res = await graph<InsightsResponse>(`${account}/insights`, {
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields: [
      "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name",
      "objective", "spend", "impressions", "reach", "clicks", "actions", "account_currency",
    ].join(","),
    limit: "500",
  });

  const ads = new Map<string, AdRow>();
  const daily: AdDailyRow[] = [];

  for (const row of res.data ?? []) {
    ads.set(row.ad_id, {
      ad_id: row.ad_id,
      ad_name: row.ad_name ?? null,
      adset_id: row.adset_id ?? null,
      adset_name: row.adset_name ?? null,
      campaign_id: row.campaign_id ?? null,
      campaign_name: row.campaign_name ?? null,
      objective: row.objective ?? null,
    });

    daily.push({
      metric_date: row.date_start,
      ad_id: row.ad_id,
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      reach: Number(row.reach ?? 0),
      clicks: Number(row.clicks ?? 0),
      // Meta solo reporta `follow` en promociones con objetivo de perfil.
      // Cuando no viene, el dato honesto es el coste por visita al perfil.
      follows: sumActions(row.actions, /follow/i),
      profile_visits: sumActions(row.actions, /profile_visit|profile_view/i),
      currency: row.account_currency ?? "EUR",
      raw: row,
    });
  }

  return { ads: [...ads.values()], daily };
}
