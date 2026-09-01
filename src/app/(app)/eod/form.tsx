"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, Select, SubmitButton } from "@/components/form";
import { fmtPercent } from "@/lib/format";
import { saveEod } from "./actions";

type Existing = Record<string, unknown> | undefined;

/** Vista previa de las tasas mientras se teclea, con las mismas fórmulas
 *  que aplica Postgres al guardar. */
function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function EodForm({
  today, setters, existing,
}: {
  today: string;
  setters?: { id: string; full_name: string }[];
  existing?: Existing;
}) {
  const [state, action] = useActionState(saveEod, null);
  const num = (key: string) => Number(existing?.[key] ?? 0);

  const [inbC, setInbC] = useState(num("inbound_conversations"));
  const [inbR, setInbR] = useState(num("inbound_replies"));
  const [outC, setOutC] = useState(num("outbound_conversations"));
  const [outR, setOutR] = useState(num("outbound_replies"));
  const [links, setLinks] = useState(num("calendly_links_sent"));
  const [booked, setBooked] = useState(num("calls_booked"));
  const [fu, setFu] = useState(num("follow_ups"));
  const [fuR, setFuR] = useState(num("follow_up_replies"));

  const total = inbC + outC;

  const counter = (
    label: string, name: string, value: number, onChange: (n: number) => void,
  ) => (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <input
        name={name} type="number" min={0} value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm tabular outline-none focus:border-[var(--brand-500)]"
        style={{ background: "var(--surface)" }}
      />
    </label>
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Fecha" name="report_date" type="date"
               defaultValue={String(existing?.report_date ?? today)} required />
        {setters && (
          <Select
            label="Setter" name="setter_id"
            options={setters.map((s) => ({ value: s.id, label: s.full_name }))}
            defaultValue={String(existing?.setter_id ?? "")}
            placeholder="Yo mismo"
          />
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--foreground-muted)" }}>
          Inbound
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {counter("Conversaciones abiertas", "inbound_conversations", inbC, setInbC)}
          {counter("Respuestas", "inbound_replies", inbR, setInbR)}
          <ReadOnly label="Tasa de respuesta" value={fmtPercent(rate(inbR, inbC))} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--foreground-muted)" }}>
          Outbound
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {counter("Conversaciones", "outbound_conversations", outC, setOutC)}
          {counter("Respuestas", "outbound_replies", outR, setOutR)}
          <ReadOnly label="Tasa de respuesta" value={fmtPercent(rate(outR, outC))} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--foreground-muted)" }}>
          Agenda
        </legend>
        <div className="grid gap-4 sm:grid-cols-4">
          {counter("Calendly pasados", "calendly_links_sent", links, setLinks)}
          {counter("Llamadas agendadas", "calls_booked", booked, setBooked)}
          <ReadOnly label="Conversaciones totales" value={String(total)} />
          <ReadOnly label="Tasa de agenda" value={fmtPercent(rate(booked, total), 1)} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--foreground-muted)" }}>
          Seguimientos
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {counter("Seguimientos", "follow_ups", fu, setFu)}
          {counter("Respuestas", "follow_up_replies", fuR, setFuR)}
          <ReadOnly label="Tasa de respuesta" value={fmtPercent(rate(fuR, fu))} />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emoción del día" name="mood"
               defaultValue={String(existing?.mood ?? "")} hint="Cómo ha ido, en una línea." />
        <Select
          label="¿Entrenaste?" name="trained"
          options={[{ value: "on", label: "Sí" }, { value: "no", label: "No" }]}
          defaultValue={existing?.trained === true ? "on" : existing?.trained === false ? "no" : ""}
          placeholder="—"
        />
      </div>

      <Field label="Notas" name="notes" defaultValue={String(existing?.notes ?? "")} />

      <FormMessage state={state} />
      <SubmitButton>{existing ? "Actualizar parte" : "Enviar parte"}</SubmitButton>
    </form>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium" style={{ color: "var(--foreground-muted)" }}>{label}</span>
      <p className="mt-1 rounded-lg border px-3 py-2 text-sm tabular"
         style={{ background: "var(--surface-sunken)", color: "var(--foreground-muted)" }}>
        {value}
      </p>
    </div>
  );
}
