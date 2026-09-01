import { NextResponse } from "next/server";

/**
 * Los crons de Vercel llegan con `Authorization: Bearer $CRON_SECRET`.
 * Sin esto, cualquiera podría lanzar las sincronizaciones desde fuera.
 */
export function assertCronRequest(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  return null;
}

/** Ventana de días hacia atrás: Meta corrige las cifras de los últimos días,
 *  así que se re-piden y se sobrescriben en vez de escribir solo el día de ayer. */
export function syncWindow(days = 7) {
  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - days);
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) };
}
