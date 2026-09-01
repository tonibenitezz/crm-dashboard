import { redirect } from "next/navigation";
import { BarList } from "@/components/charts";
import { Card, Cell, EmptyState, Row, Table } from "@/components/ui";
import { getCloserLeaderboard, getSetterLeaderboard } from "@/lib/metrics/queries";
import { createServerSupabase, getCurrentMember, isManager } from "@/lib/supabase/server";
import { fmtMoney, fmtNumber, fmtPercent, monthToDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const member = await getCurrentMember();
  if (!isManager(member)) redirect("/");

  const month = monthToDate();
  const db = await createServerSupabase();
  const [setters, closers, roster] = await Promise.all([
    getSetterLeaderboard(month.from, month.to),
    getCloserLeaderboard(month.from, month.to),
    db.from("team_members")
      .select("id, full_name, email, role, active, calendly_user_uri, slack_user_id")
      .order("role").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Equipo</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
          Rendimiento del mes en curso.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tasa de agenda por setter" subtitle="Agendas reales de Calendly sobre conversaciones del EOD">
          <BarList
            items={setters.map((s) => ({
              label: s.full_name,
              value: s.bookingRate ?? 0,
              hint: `${fmtNumber(s.bookings)} de ${fmtNumber(s.conversations)} convs`,
            }))}
            formatValue={(v) => fmtPercent(v, 1)}
            color="var(--series-1)"
          />
        </Card>

        <Card title="Tasa de cierre por closer" subtitle="Cierres sobre llamadas celebradas y cualificadas">
          <BarList
            items={closers.map((c) => ({
              label: c.full_name,
              value: c.closeRate ?? 0,
              hint: `${fmtNumber(c.closes)} de ${fmtNumber(c.held)} llamadas`,
            }))}
            formatValue={(v) => fmtPercent(v)}
            color="var(--series-3)"
          />
        </Card>
      </div>

      <Card title="Setters" subtitle="Este mes">
        <Table head={["Setter", "Conversaciones", "Agendas", "% de agenda"]}>
          {setters.map((s) => (
            <Row key={s.setter_id}>
              <Cell align="left">{s.full_name}</Cell>
              <Cell>{fmtNumber(s.conversations)}</Cell>
              <Cell>{fmtNumber(s.bookings)}</Cell>
              <Cell>{fmtPercent(s.bookingRate, 1)}</Cell>
            </Row>
          ))}
        </Table>
        {!setters.length && <EmptyState title="Sin datos de setters este mes." />}
      </Card>

      <Card title="Closers" subtitle="Este mes">
        <Table head={["Closer", "Llamadas", "Celebradas", "No shows", "Cierres", "% cierre", "Contratado"]}>
          {closers.map((c) => (
            <Row key={c.closer_id}>
              <Cell align="left">{c.full_name}</Cell>
              <Cell>{fmtNumber(c.calls)}</Cell>
              <Cell>{fmtNumber(c.held)}</Cell>
              <Cell muted>{fmtNumber(c.noShows)}</Cell>
              <Cell>{fmtNumber(c.closes)}</Cell>
              <Cell>{fmtPercent(c.closeRate)}</Cell>
              <Cell>{fmtMoney(c.contracted)}</Cell>
            </Row>
          ))}
        </Table>
        {!closers.length && <EmptyState title="Sin datos de closers este mes." />}
      </Card>

      <Card title="Plantilla" subtitle="Para que las agendas se asignen solas, cada closer necesita su URI de Calendly">
        <Table head={["Nombre", "Email", "Rol", "Calendly", "Slack", "Estado"]}>
          {(roster.data ?? []).map((m) => (
            <Row key={m.id}>
              <Cell align="left">{m.full_name}</Cell>
              <Cell align="left" muted>{m.email}</Cell>
              <Cell align="left" muted>{m.role}</Cell>
              <Cell align="left" muted>{m.calendly_user_uri ? "✓" : "—"}</Cell>
              <Cell align="left" muted>{m.slack_user_id ? "✓" : "—"}</Cell>
              <Cell align="left" muted>{m.active ? "Activo" : "Inactivo"}</Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </div>
  );
}
