import { Card, Cell, EmptyState, Row, Table } from "@/components/ui";
import { createServerSupabase, getCurrentMember, isManager } from "@/lib/supabase/server";
import { fmtDate, fmtNumber, fmtPercent } from "@/lib/format";
import { EodForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EodPage() {
  const member = await getCurrentMember();
  const db = await createServerSupabase();

  const manager = isManager(member);
  const { data: setters } = manager
    ? await db.from("team_members").select("id, full_name").eq("role", "setter").eq("active", true).order("full_name")
    : { data: null };

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayReport } = await db
    .from("eod_reports")
    .select("*")
    .eq("setter_id", member!.id)
    .eq("report_date", today)
    .maybeSingle();

  const { data: recent } = await db
    .from("eod_reports")
    .select("id, report_date, setter_id, total_conversations, calls_booked, booking_rate, inbound_reply_rate, outbound_reply_rate, mood")
    .order("report_date", { ascending: false })
    .limit(14);

  const { data: members } = await db.from("team_members").select("id, full_name");
  const names = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">EOD</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
          Un parte por día. Los totales y los porcentajes se calculan solos: no hay que teclearlos.
        </p>
      </div>

      <Card title={todayReport ? "Editar el parte de hoy" : "Parte de hoy"}>
        <EodForm
          today={today}
          setters={setters ?? undefined}
          existing={todayReport ?? undefined}
        />
      </Card>

      <Card title="Últimos partes">
        <Table head={["Fecha", "Setter", "Convs", "Agendas", "% agenda", "% resp. inb", "% resp. out", "Ánimo"]}>
          {(recent ?? []).map((r) => (
            <Row key={r.id}>
              <Cell align="left">{fmtDate(r.report_date)}</Cell>
              <Cell align="left" muted>{names.get(r.setter_id) ?? "—"}</Cell>
              <Cell>{fmtNumber(r.total_conversations)}</Cell>
              <Cell>{fmtNumber(r.calls_booked)}</Cell>
              <Cell>{fmtPercent(r.booking_rate, 1)}</Cell>
              <Cell muted>{fmtPercent(r.inbound_reply_rate)}</Cell>
              <Cell muted>{fmtPercent(r.outbound_reply_rate)}</Cell>
              <Cell align="left" muted>{r.mood ?? "—"}</Cell>
            </Row>
          ))}
        </Table>
        {!recent?.length && <EmptyState title="Todavía no hay partes enviados." />}
      </Card>
    </div>
  );
}
