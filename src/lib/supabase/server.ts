import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/**
 * Cliente de servicio: salta RLS. Solo para webhooks y crons; nunca se
 * importa desde algo que acabe en el navegador.
 */
export function serviceClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

/**
 * Cliente ligado a la sesión del usuario. Respeta RLS, así que un setter
 * solo ve y escribe lo que sus políticas permiten.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Los Server Components no pueden escribir cookies; el proxy
            // ya refresca la sesión, así que aquí es seguro ignorarlo.
          }
        },
      },
    },
  );
}

export type CurrentMember = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "manager" | "setter" | "closer";
  slack_user_id: string | null;
};

/** El miembro del equipo asociado al usuario autenticado, o null. */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const db = await createServerSupabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  const { data } = await db
    .from("team_members")
    .select("id, full_name, email, role, slack_user_id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  return (data as CurrentMember) ?? null;
}

export function isManager(member: CurrentMember | null): boolean {
  return member?.role === "admin" || member?.role === "manager";
}
