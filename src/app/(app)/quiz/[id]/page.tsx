import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { createServerSupabase } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/format";
import { getFunnel } from "@/lib/quiz/funnels";
import { answersToText, type Answers, type Plan } from "@/lib/quiz/plan";
import { markContacted, saveNotes } from "./actions";

export const dynamic = "force-dynamic";

const muted = { color: "var(--foreground-muted)" } as const;

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createServerSupabase();

  const { data: s } = await db.from("quiz_submissions").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const { data: bookings } = s.lead_id
    ? await db
        .from("bookings")
        .select("id, scheduled_at, status")
        .eq("lead_id", s.lead_id)
        .order("scheduled_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const funnel = getFunnel(s.funnel);
  const plan = s.plan as Plan | null;
  const firstName = String(s.full_name).split(/\s+/)[0];
  const phoneDigits = String(s.phone ?? "").replace(/\D/g, "");
  const waText = plan
    ? `Hola ${firstName}, soy ${funnel?.owner ?? ""} de ${funnel?.brand ?? ""}. He revisado tu plan: tu cuello de botella principal es "${plan.cuello_de_botella.titulo}". ¿Te va bien una llamada de 30 min para explicártelo entero?`
    : `Hola ${firstName}, soy ${funnel?.owner ?? ""} de ${funnel?.brand ?? ""}. He visto tus respuestas del quiz, ¿te va bien una llamada de 30 min para revisar tu plan?`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/quiz" className="text-sm hover:underline" style={muted}>← Quiz</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">{s.full_name}</h1>
          {plan && (
            <Badge tone={plan.interno.encaje === "alto" ? "positive" : plan.interno.encaje === "medio" ? "warning" : "neutral"}>
              Encaje {plan.interno.encaje}
            </Badge>
          )}
          {s.status === "error" && <Badge tone="negative">El plan falló</Badge>}
          {s.status === "generando" && <Badge tone="warning">Generando</Badge>}
        </div>
        <p className="mt-1 text-sm" style={muted}>
          {s.email} · {s.phone ?? "sin teléfono"}
          {s.instagram_handle ? ` · @${s.instagram_handle}` : ""} · {fmtDateTime(s.created_at)}
          {s.utm_source ? ` · origen: ${s.utm_source}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {phoneDigits && (
          <a
            href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--positive)" }}
          >
            Escribir por WhatsApp
          </a>
        )}
        <form action={markContacted}>
          <input type="hidden" name="id" value={s.id} />
          {s.contacted_at && <input type="hidden" name="undo" value="1" />}
          <SubmitButton>{s.contacted_at ? "Desmarcar contactado" : "Marcar como contactado"}</SubmitButton>
        </form>
        {s.contacted_at && (
          <span className="self-center text-xs" style={muted}>Contactado el {fmtDateTime(s.contacted_at)}</span>
        )}
        {bookings?.map((b) => (
          <Badge key={b.id} tone="brand">Agenda: {fmtDateTime(b.scheduled_at)} ({b.status})</Badge>
        ))}
      </div>

      {s.status === "error" && (
        <Card title="No se pudo generar el plan">
          <p className="text-sm" style={muted}>{s.error}</p>
          <p className="mt-2 text-sm">El lead está guardado: contáctale igualmente con las respuestas de abajo.</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {plan && (
            <>
              <Card title="Diagnóstico">
                <p className="text-sm leading-relaxed">{plan.resumen}</p>
                <h3 className="mt-4 text-sm font-semibold">{funnel?.plan.labels.obstacle ?? "Obstáculo"}: {plan.cuello_de_botella.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed" style={muted}>{plan.cuello_de_botella.explicacion}</p>
                <p className="mt-2 text-sm">📍 {plan.cuello_de_botella.metrica_clave}</p>
              </Card>

              <Card title={`${funnel?.plan.labels.numbers ?? "Números"}: ${plan.numeros.actual} → ${plan.numeros.objetivo}`}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {plan.numeros.metricas.map((x) => [x.etiqueta, x.valor]).map(([l, v]) => (
                    <div key={l} className="rounded-lg p-3" style={{ background: "var(--surface-sunken)" }}>
                      <p className="text-lg font-semibold">{v}</p>
                      <p className="text-xs" style={muted}>{l}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={muted}>{plan.numeros.explicacion}</p>
              </Card>

              <Card title="Palancas, en orden">
                <ol className="space-y-4">
                  {plan.palancas.map((p, i) => (
                    <li key={i}>
                      <p className="text-sm font-semibold">{i + 1}. {p.titulo}</p>
                      <p className="mt-1 text-sm" style={muted}>{p.por_que}</p>
                      <p className="mt-1 text-sm"><strong>Acción:</strong> {p.accion}</p>
                      <p className="mt-1 text-xs" style={muted}>KPI: {p.kpi}</p>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card title="Plan de 90 días">
                <div className="grid gap-4 sm:grid-cols-2">
                  {plan.plan_semanal.map((w, i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <p className="text-xs font-semibold" style={{ color: "var(--brand-600)" }}>{w.semana}</p>
                      <p className="mt-1 text-sm font-semibold">{w.foco}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                        {w.acciones.map((a, j) => <li key={j}>{a}</li>)}
                      </ul>
                      <p className="mt-2 text-xs" style={muted}>✔ {w.checkpoint}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Error a evitar y fase 2">
                <p className="text-sm leading-relaxed">⚠️ {plan.error_a_evitar}</p>
                <p className="mt-3 text-sm leading-relaxed">🚀 {plan.fase_2}</p>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          {plan && (
            <Card title="Para la llamada" subtitle="Solo lo ve el equipo">
              <p className="text-sm">{plan.interno.motivo_encaje}</p>
              <h3 className="mt-4 text-xs font-semibold" style={muted}>Preguntas</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                {plan.interno.preguntas_llamada.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
              <h3 className="mt-4 text-xs font-semibold" style={muted}>Objeciones probables</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                {plan.interno.objeciones_probables.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </Card>
          )}

          <Card title="Respuestas">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {funnel ? answersToText(funnel.questions, s.answers as Answers) : JSON.stringify(s.answers, null, 2)}
            </pre>
          </Card>

          <Card title="Notas">
            <form action={saveNotes} className="space-y-2">
              <input type="hidden" name="id" value={s.id} />
              <textarea
                name="notes"
                defaultValue={s.notes ?? ""}
                rows={5}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
                style={{ background: "var(--surface)" }}
              />
              <SubmitButton>Guardar notas</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
