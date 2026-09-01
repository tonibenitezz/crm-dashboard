import { Badge, Card, Cell, EmptyState, Row, StatTile, Table } from "@/components/ui";
import { createServerSupabase } from "@/lib/supabase/server";
import { fmtDate, fmtMoney, fmtNumber, monthToDate } from "@/lib/format";
import { DealForm } from "./form";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CierresPage() {
  const db = await createServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const month = monthToDate();

  const [programs, members, bookings, deals, monthCash] = await Promise.all([
    db.from("programs").select("id, name").eq("active", true).order("sort_order"),
    db.from("team_members").select("id, full_name, role").eq("active", true).order("full_name"),
    db.from("bookings")
      .select("id, invitee_name, invitee_email, scheduled_at")
      .neq("closing_status", "closed")
      .in("status", ["agendada", "completada", "reagendada"])
      .order("scheduled_at", { ascending: false })
      .limit(60),
    db.from("deals")
      .select("id, deal_name, closed_at, ticket, currency, payment_kind, status, program:program_id(name), closer:closer_id(full_name)")
      .order("closed_at", { ascending: false })
      .limit(40),
    db.from("v_cash_by_day").select("cash").gte("metric_date", month.from).lte("metric_date", month.to),
  ]);

  const all = members.data ?? [];
  const cash = (monthCash.data ?? []).reduce((s, r) => s + Number(r.cash ?? 0), 0);
  const monthDeals = (deals.data ?? []).filter((d) => d.closed_at >= month.from);
  const contracted = monthDeals.reduce((s, d) => s + Number(d.ticket ?? 0), 0);

  const first = <T,>(v: T | T[] | null): T | undefined =>
    Array.isArray(v) ? v[0] : (v ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Cierres</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
          Al guardar se avisa en Slack, se generan las cuotas y la agenda de origen pasa a cerrada.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cash collected del mes" value={fmtMoney(cash)} />
        <StatTile label="Contratado del mes" value={fmtMoney(contracted)} />
        <StatTile label="Cierres del mes" value={fmtNumber(monthDeals.length)} />
        <StatTile
          label="Ticket medio del mes"
          value={monthDeals.length ? fmtMoney(contracted / monthDeals.length) : "—"}
        />
      </div>

      <Card title="Cargar un cierre">
        <DealForm
          today={today}
          programs={(programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
          closers={all.filter((m) => m.role !== "setter").map((m) => ({ value: m.id, label: m.full_name }))}
          setters={all.filter((m) => m.role === "setter").map((m) => ({ value: m.id, label: m.full_name }))}
          openBookings={(bookings.data ?? []).map((b) => ({
            id: b.id,
            name: b.invitee_name ?? "",
            email: b.invitee_email ?? "",
            label: `${b.invitee_name ?? b.invitee_email ?? "Sin nombre"} · ${fmtDateTime(b.scheduled_at)}`,
          }))}
        />
      </Card>

      <Card title="Últimos cierres">
        <Table head={["Cliente", "Programa", "Closer", "Fecha", "Tipo", "Ticket"]}>
          {(deals.data ?? []).map((d) => (
            <Row key={d.id}>
              <Cell align="left">{d.deal_name}</Cell>
              <Cell align="left" muted>{first(d.program as { name: string }[])?.name ?? "—"}</Cell>
              <Cell align="left" muted>{first(d.closer as { full_name: string }[])?.full_name ?? "—"}</Cell>
              <Cell>{fmtDate(d.closed_at)}</Cell>
              <Cell align="left">
                <Badge tone={d.payment_kind === "full_pay" ? "positive" : "brand"}>
                  {d.payment_kind === "full_pay" ? "Pago único" : "Cuotas"}
                </Badge>
              </Cell>
              <Cell>{fmtMoney(Number(d.ticket), d.currency)}</Cell>
            </Row>
          ))}
        </Table>
        {!deals.data?.length && (
          <EmptyState title="Todavía no hay cierres" hint="El primero que cargues aparecerá aquí y en Slack." />
        )}
      </Card>
    </div>
  );
}
