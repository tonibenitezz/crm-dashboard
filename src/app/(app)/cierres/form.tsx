"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, Select, SubmitButton } from "@/components/form";
import { fmtMoney } from "@/lib/format";
import { createDeal } from "./actions";

type Option = { value: string; label: string };

export function DealForm({
  today, programs, closers, setters, openBookings,
}: {
  today: string;
  programs: Option[];
  closers: Option[];
  setters: Option[];
  openBookings: { id: string; label: string; email: string; name: string }[];
}) {
  const [state, action] = useActionState(createDeal, null);

  const [kind, setKind] = useState("full_pay");
  const [ticket, setTicket] = useState(0);
  const [cashNow, setCashNow] = useState(0);
  const [installments, setInstallments] = useState(1);
  const [bookingId, setBookingId] = useState("");
  const [prefill, setPrefill] = useState<{ email: string; name: string } | null>(null);

  const fullPay = kind === "full_pay";
  const pending = Math.max(0, ticket - (fullPay ? ticket : cashNow));

  return (
    <form action={action} className="space-y-5" key={state?.ok ?? "form"}>
      {/* Enlazar con la agenda rellena el cliente y cierra el embudo:
          al guardar, esa agenda pasa a "closed" automáticamente. */}
      <label className="block">
        <span className="text-xs font-medium">Agenda de la que viene</span>
        <select
          name="booking_id" value={bookingId}
          onChange={(e) => {
            setBookingId(e.target.value);
            const booking = openBookings.find((b) => b.id === e.target.value);
            setPrefill(booking ? { email: booking.email, name: booking.name } : null);
          }}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
          style={{ background: "var(--surface)" }}
        >
          <option value="">Sin agenda previa (venta directa)</option>
          {openBookings.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field key={`name-${bookingId}`} label="Cliente" name="deal_name" required
               defaultValue={prefill?.name} />
        <Field key={`email-${bookingId}`} label="Email" name="email" type="email"
               defaultValue={prefill?.email} />
        <Field label="Teléfono" name="phone" />
        <Field label="Fecha de cierre" name="closed_at" type="date" defaultValue={today} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Programa" name="program_id" options={programs} placeholder="—" />
        <Select label="Closer" name="closer_id" options={closers} placeholder="Yo mismo" />
        <Select label="Setter" name="setter_id" options={setters} placeholder="Sin atribuir" />
        <Select
          label="Fuente" name="source" placeholder="—"
          options={["Instagram", "Vsl", "Youtube", "Whatsapp", "Referido"].map((s) => ({ value: s, label: s }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Forma de pago" name="payment_method" placeholder="—"
          options={["Transferencia", "SeQura", "Stripe", "Hotmart"].map((s) => ({ value: s, label: s }))}
        />
        <Field label="Tipo de pago" name="payment_kind">
          <select
            name="payment_kind" value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              if (e.target.value === "full_pay") setInstallments(1);
            }}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
            style={{ background: "var(--surface)" }}
          >
            <option value="full_pay">Pago único</option>
            <option value="plan_completo">Plan de pago completo</option>
            <option value="cuotas">Cuotas / financiación</option>
          </select>
        </Field>

        <label className="block">
          <span className="text-xs font-medium">Ticket (total)</span>
          <input
            name="ticket" type="number" min={0} step="0.01" required value={ticket || ""}
            onChange={(e) => {
              const n = Number(e.target.value || 0);
              setTicket(n);
              if (fullPay) setCashNow(n);
            }}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm tabular outline-none focus:border-[var(--brand-500)]"
            style={{ background: "var(--surface)" }}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium">Cobrado hoy</span>
          <input
            name="cash_now" type="number" min={0} step="0.01" required
            value={fullPay ? ticket || "" : cashNow || ""}
            readOnly={fullPay}
            onChange={(e) => setCashNow(Number(e.target.value || 0))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm tabular outline-none focus:border-[var(--brand-500)] read-only:opacity-60"
            style={{ background: fullPay ? "var(--surface-sunken)" : "var(--surface)" }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium">Número de cuotas</span>
          <input
            name="installments" type="number" min={1} max={12} value={installments}
            disabled={fullPay}
            onChange={(e) => setInstallments(Number(e.target.value || 1))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm tabular outline-none focus:border-[var(--brand-500)] disabled:opacity-60"
            style={{ background: fullPay ? "var(--surface-sunken)" : "var(--surface)" }}
          />
        </label>
        <div className="sm:col-span-2 flex items-end">
          <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
            Cash collected hoy <span className="tabular font-medium" style={{ color: "var(--foreground)" }}>
              {fmtMoney(fullPay ? ticket : cashNow)}
            </span>
            {pending > 0 && (
              <> · pendiente <span className="tabular">{fmtMoney(pending)}</span> en{" "}
              {installments - 1} cuota{installments - 1 === 1 ? "" : "s"} a 30 días</>
            )}
          </p>
        </div>
      </div>

      <input type="hidden" name="currency" value="EUR" />
      <Field label="Notas" name="notes" />

      <FormMessage state={state} />
      <SubmitButton>Guardar cierre y avisar a Slack</SubmitButton>
    </form>
  );
}
