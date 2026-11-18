import Link from "next/link";
import { Badge, Card, Cell, EmptyState, Row, StatTile, Table, type Tone } from "@/components/ui";
import { createServerSupabase } from "@/lib/supabase/server";
import { fmtDateTime, fmtNumber, fmtPercent, lastNDays } from "@/lib/format";
import type { Plan } from "@/lib/quiz/plan";

export const dynamic = "force-dynamic";

const FIT: Record<string, { label: string; tone: Tone }> = {
  alto:  { label: "Encaje alto",  tone: "positive" },
  medio: { label: "Encaje medio", tone: "warning" },
  bajo:  { label: "Encaje bajo",  tone: "neutral" },
};

const first = <T,>(v: T | T[] | null | undefined): T | undefined =>
  Array.isArray(v) ? v[0] : (v ?? undefined);

export default async function QuizListPage() {
  const db = await createServerSupabase();
  const range = lastNDays(30);

  const { data } = await db
    .from("quiz_submissions")
    .select(`id, funnel, full_name, email, phone, status, plan, answers, contacted_at, created_at,
             utm_source, lead:lead_id(status)`)
    .order("created_at", { ascending: false })
    .limit(150);

  const rows = data ?? [];
  const last30 = rows.filter((r) => r.created_at.slice(0, 10) >= range.from);
  const booked30 = last30.filter((r) => {
    const s = first(r.lead as { status: string }[] | null)?.status;
    return s === "agendado" || s === "cerrado" || s === "no_show";
  });
  const pending = rows.filter((r) => !r.contacted_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Quiz</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
            Leads del quiz con su plan. El lead solo ve un adelanto; el plan completo está aquí para la llamada.
          </p>
        </div>
        <Link
          href="/plan"
          target="_blank"
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--surface-sunken)]"
        >
          Abrir el quiz ↗
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Leads del quiz (30 días)" value={fmtNumber(last30.length)} />
        <StatTile label="Han agendado (30 días)" value={fmtNumber(booked30.length)} />
        <StatTile
          label="Quiz → agenda"
          value={last30.length ? fmtPercent(booked30.length / last30.length) : "—"}
        />
        <StatTile label="Sin contactar" value={fmtNumber(pending)} hint="De los últimos 150" />
      </div>

      <Card title={`Últimos ${rows.length} envíos`}>
        <Table head={["Lead", "Facturación", "Obstáculo principal", "Encaje", "Estado", "Recibido"]}>
          {rows.map((r) => {
            const plan = r.plan as Plan | null;
            const fit = plan?.interno?.encaje;
            const leadStatus = first(r.lead as { status: string }[] | null)?.status;
            const revenue = (r.answers as Record<string, unknown>)?.facturacion;
            return (
              <Row key={r.id}>
                <Cell align="left">
                  <Link href={`/quiz/${r.id}`} className="font-medium hover:underline">{r.full_name}</Link>
                  <span className="block text-xs" style={{ color: "var(--foreground-muted)" }}>{r.email}</span>
                </Cell>
                <Cell align="left" muted>{typeof revenue === "string" ? revenue : "—"}</Cell>
                <Cell align="left" muted>
                  <span className="line-clamp-1 max-w-64">
                    {plan?.cuello_de_botella.titulo ?? (r.status === "error" ? "El plan falló" : "Generando…")}
                  </span>
                </Cell>
                <Cell align="left">
                  {fit ? <Badge tone={FIT[fit].tone}>{FIT[fit].label}</Badge> : <Badge>—</Badge>}
                </Cell>
                <Cell align="left">
                  {leadStatus === "agendado" ? (
                    <Badge tone="brand">Agendó</Badge>
                  ) : r.contacted_at ? (
                    <Badge tone="positive">Contactado</Badge>
                  ) : (
                    <Badge tone="warning">Por contactar</Badge>
                  )}
                </Cell>
                <Cell>{fmtDateTime(r.created_at)}</Cell>
              </Row>
            );
          })}
        </Table>
        {!rows.length && (
          <EmptyState
            title="Aún no ha entrado nadie por el quiz"
            hint="Comparte el enlace /plan en la bio o en los anuncios."
          />
        )}
      </Card>
    </div>
  );
}
