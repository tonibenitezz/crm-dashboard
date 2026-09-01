import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de servicio: salta RLS. Solo para webhooks y crons,
 * nunca se importa desde un componente que llegue al navegador.
 */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}
