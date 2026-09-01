import Link from "next/link";
import { TimeSeries } from "@/components/charts";
import { BarList } from "@/components/charts";
import { Card, Cell, EmptyState, HeroFigure, Row, StatTile, Table } from "@/components/ui";
import {
  fillGaps, getCloserLeaderboard, getOverview, getSetterLeaderboard, sumOverview,
} from "@/lib/metrics/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  fmtCompactMoney, fmtDateTime, fmtMoney, fmtNumber, fmtPercent, fmtRatio,
  lastNDays, monthToDate,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Variación relativa entre dos periodos, null si no hay base con la que comparar. */
function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function previousMonthToDate() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function DashboardPage() {
  const month = monthToDate();
  const prevMonth = previousMonthToDate();
  const window30 = lastNDays(30);

  const db = await createServerSupabase();
  const [monthRows, prevRows, dailyRows, setters, closers, upcoming] = await Promise.all([
    getOverview(month.from, month.to),
    getOverview(prevMonth.from, prevMonth.to),
    getOverview(window30.from, window30.to),
    getSetterLeaderboard(month.from, month.to),
    getCloserLeaderboard(month.from, month.to),
    db
      .from("bookings")
      .select("id, invitee_name, invitee_email, scheduled_at, status, closer:closer_id(full_name)")
      .gte("scheduled_at", new Date().toISOString())
      .in("status", ["agendada", "reagendada"])
      .order("scheduled_at")
      .limit(8),
  ]);

  const now = sumOverview(monthRows);
  const before = sumOverview(prevRows);
  const daily = fillGaps(dailyRows, window30.from, window30.to);

  const followersTotal =
    [...dailyRows].reverse().find((r) => r.followers_total != null)?.followers_total ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HeroFigure
          label="Cash collected este mes"
          value={fmtMoney(now.cash)}
          delta={delta(now.cash, before.cash)}
          deltaLabel="vs mismo día del mes pasado"
        />
        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
          Contratado: <span className="tabular">{fmtMoney(now.contracted)}</span>
          {" · "}Inversión: <span className="tabular">{fmtMoney(now.spend)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="ROAS" value={fmtRatio(now.roas)}
          delta={now.roas != null && before.roas != null ? delta(now.roas, before.roas) : null}
          hint={now.spend === 0 ? "Sin inversión registrada" : undefined}
        />
        <StatTile
          label="Agendas" value={fmtNumber(now.bookings)}
          delta={delta(now.bookings, before.bookings)}
        />
        <StatTile
          label="Cierres" value={fmtNumber(now.closes)}
          delta={delta(now.closes, before.closes)}
        />
        <StatTile
          label="Coste por agenda" value={fmtMoney(now.costPerBooking)}
          hint={now.costPerBooking == null ? "Falta inversión o agendas" : undefined}
        />
        <StatTile
          label="Coste por cierre" value={fmtMoney(now.costPerClose)}
          hint={now.costPerClose == null ? "Sin cierres este mes" : undefined}
        />
        <StatTile
          label="Nuevos seguidores" value={fmtNumber(now.newFollowers)}
          delta={delta(now.newFollowers, before.newFollowers)}
        />
        <StatTile
          label="Coste por seguidor" value={fmtMoney(now.costPerFollower)}
          hint={now.costPerFollower == null ? "Esperando datos de Instagram" : undefined}
        />
        <StatTile
          label="Seguidores totales" value={fmtNumber(followersTotal)}
          hint={followersTotal == null ? "Esperando datos de Instagram" : undefined}
        />
      </div>

      <Card
        title="Cash collected e inversión"
        subtitle="Últimos 30 días · las dos series son euros, así que comparten eje"
      >
        <TimeSeries
          data={daily.map((d) => ({
            date: d.metric_date,
            cash: Number(d.cash_collected ?? 0),
            spend: Number(d.ad_spend ?? 0),
          }))}
          series={[
            { key: "cash",  label: "Cash collected", color: "var(--series-1)" },
            { key: "spend", label: "Inversión",      color: "var(--series-2)" },
          ]}
          formatValue={(v) => fmtCompactMoney(v)}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Agendas por setter" subtitle="Este mes, con tasa de agenda sobre conversaciones">
          <BarList
            items={setters.map((s) => ({
              label: s.full_name,
              value: s.bookings,
              hint: s.bookingRate != null ? `${fmtPercent(s.bookingRate, 1)} de agenda` : undefined,
            }))}
            formatValue={(v) => `${fmtNumber(v)} agendas`}
            color="var(--series-1)"
          />
        </Card>

        <Card title="Contratado por closer" subtitle="Este mes, con tasa de cierre sobre llamadas cualificadas">
          <BarList
            items={closers.map((c) => ({
              label: c.full_name,
              value: c.contracted,
              hint: c.closeRate != null ? `${fmtPercent(c.closeRate)} de cierre` : undefined,
            }))}
            formatValue={(v) => fmtMoney(v)}
            color="var(--series-3)"
          />
        </Card>
      </div>

      {/* Vista de tabla: los mismos números en texto, sin depender del color */}
      <Card title="Rendimiento del equipo" subtitle="Este mes">
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
        {!closers.length && <EmptyState title="Aún no hay llamadas asignadas a ningún closer." />}
      </Card>

      <Card
        title="Próximas llamadas"
        action={<Link href="/agendas" className="text-xs underline" style={{ color: "var(--foreground-muted)" }}>Ver todas</Link>}
      >
        <Table head={["Lead", "Closer", "Cuándo"]}>
          {(upcoming.data ?? []).map((b) => {
            // Supabase devuelve la relación como array cuando no hay tipos generados.
            const closer = (Array.isArray(b.closer) ? b.closer[0] : b.closer) as
              | { full_name: string }
              | undefined;
            return (
              <Row key={b.id}>
                <Cell align="left">
                  <span className="font-medium">{b.invitee_name ?? "—"}</span>
                  <span className="block text-xs" style={{ color: "var(--foreground-muted)" }}>
                    {b.invitee_email}
                  </span>
                </Cell>
                <Cell align="left" muted>{closer?.full_name ?? "Sin asignar"}</Cell>
                <Cell>{fmtDateTime(b.scheduled_at)}</Cell>
              </Row>
            );
          })}
        </Table>
        {!upcoming.data?.length && (
          <EmptyState
            title="No hay llamadas próximas"
            hint="Aparecerán aquí solas en cuanto alguien agende por Calendly."
          />
        )}
      </Card>
    </div>
  );
}
