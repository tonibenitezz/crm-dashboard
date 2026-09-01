import { Badge, Card, Cell, EmptyState, Row, Table, type Tone } from "@/components/ui";
import { createServerSupabase } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  agendada:   { label: "Agendada",   tone: "brand" },
  completada: { label: "Celebrada",  tone: "positive" },
  no_show:    { label: "No show",    tone: "negative" },
  cancelada:  { label: "Cancelada",  tone: "neutral" },
  reagendada: { label: "Reagendada", tone: "warning" },
};

const CLOSING: Record<string, { label: string; tone: Tone }> = {
  para_cerrar:  { label: "Para cerrar",  tone: "brand" },
  seguimiento:  { label: "Seguimiento",  tone: "warning" },
  closed:       { label: "Cerrada",      tone: "positive" },
  no_califica:  { label: "No califica",  tone: "neutral" },
  perdido:      { label: "Perdida",      tone: "negative" },
};

export default async function AgendasPage() {
  const db = await createServerSupabase();
  const { data } = await db
    .from("bookings")
    .select(`id, invitee_name, invitee_email, instagram_handle, current_revenue,
             scheduled_at, booked_at, status, closing_status, utm_source,
             closer:closer_id(full_name), setter:setter_id(full_name)`)
    .order("scheduled_at", { ascending: false })
    .limit(100);

  const first = <T,>(v: T | T[] | null): T | undefined =>
    Array.isArray(v) ? v[0] : (v ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Agendas</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
          Entran solas desde Calendly. El closer se asigna por el anfitrión de la llamada
          y el setter por el UTM de su enlace.
        </p>
      </div>

      <Card title={`Últimas ${data?.length ?? 0} agendas`}>
        <Table head={["Lead", "Facturación", "Setter", "Closer", "Llamada", "Estado", "Pipeline"]}>
          {(data ?? []).map((b) => (
            <Row key={b.id}>
              <Cell align="left">
                <span className="font-medium">{b.invitee_name ?? "—"}</span>
                <span className="block text-xs" style={{ color: "var(--foreground-muted)" }}>
                  {b.instagram_handle ? `@${b.instagram_handle}` : b.invitee_email}
                </span>
              </Cell>
              <Cell align="left" muted>
                <span className="line-clamp-1 max-w-40">{b.current_revenue ?? "—"}</span>
              </Cell>
              <Cell align="left" muted>{first(b.setter as { full_name: string }[])?.full_name ?? "—"}</Cell>
              <Cell align="left" muted>{first(b.closer as { full_name: string }[])?.full_name ?? "—"}</Cell>
              <Cell>{fmtDateTime(b.scheduled_at)}</Cell>
              <Cell align="left">
                <Badge tone={STATUS[b.status]?.tone ?? "neutral"}>
                  {STATUS[b.status]?.label ?? b.status}
                </Badge>
              </Cell>
              <Cell align="left">
                <Badge tone={CLOSING[b.closing_status]?.tone ?? "neutral"}>
                  {CLOSING[b.closing_status]?.label ?? b.closing_status}
                </Badge>
              </Cell>
            </Row>
          ))}
        </Table>
        {!data?.length && (
          <EmptyState
            title="Aún no ha entrado ninguna agenda"
            hint="En cuanto el webhook de Calendly esté dado de alta, aparecerán aquí solas."
          />
        )}
      </Card>
    </div>
  );
}
