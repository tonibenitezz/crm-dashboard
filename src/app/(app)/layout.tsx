import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember, isManager } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/",        label: "Dashboard", roles: "all" },
  { href: "/agendas", label: "Agendas",   roles: "all" },
  { href: "/cierres", label: "Cierres",   roles: "all" },
  { href: "/quiz",    label: "Quiz",      roles: "all" },
  { href: "/eod",     label: "EOD",       roles: "all" },
  { href: "/equipo",  label: "Equipo",    roles: "manager" },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();

  // Autenticado en Supabase pero sin ficha en team_members: sin ficha no
  // hay rol, y sin rol las políticas de RLS no dejan leer nada.
  if (!member) redirect("/sin-acceso");

  const links = NAV.filter((n) => n.roles === "all" || isManager(member));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}>
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-white"
              style={{ background: "var(--brand-500)" }}
            >
              C
            </span>
            <span className="text-sm">CRM</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {links.map((n) => (
              <Link
                key={n.href} href={n.href}
                className="rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap hover:bg-[var(--surface-sunken)]"
                style={{ color: "var(--foreground-muted)" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs sm:block" style={{ color: "var(--foreground-muted)" }}>
              {member.full_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-xs hover:bg-[var(--surface-sunken)]"
                style={{ color: "var(--foreground-muted)" }}
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}
