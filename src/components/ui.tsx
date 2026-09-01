import type { ReactNode } from "react";

export function Card({
  title, subtitle, action, children, className = "",
}: {
  title?: string; subtitle?: string; action?: ReactNode;
  children: ReactNode; className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius)] border bg-surface p-5 ${className}`}
      style={{ background: "var(--surface)" }}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--foreground-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Cifra principal de la vista. Solo una por pantalla: si todo destaca,
 * nada destaca.
 */
export function HeroFigure({
  label, value, delta, deltaLabel,
}: { label: string; value: string; delta?: number | null; deltaLabel?: string }) {
  return (
    <div>
      <p className="text-xs font-medium" style={{ color: "var(--foreground-muted)" }}>{label}</p>
      <p className="mt-1 text-5xl font-semibold tracking-tight">{value}</p>
      {delta != null && <Delta value={delta} label={deltaLabel} className="mt-2" />}
    </div>
  );
}

export function StatTile({
  label, value, delta, deltaLabel, hint,
}: {
  label: string; value: string; delta?: number | null;
  deltaLabel?: string; hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border p-4" style={{ background: "var(--surface)" }}>
      <p className="text-xs font-medium" style={{ color: "var(--foreground-muted)" }}>{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      {delta != null ? (
        <Delta value={delta} label={deltaLabel} className="mt-1.5" />
      ) : hint ? (
        <p className="mt-1.5 text-xs" style={{ color: "var(--foreground-muted)" }}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Variación relativa. El color indica dirección; el signo lo repite por si el color no llega. */
function Delta({ value, label, className = "" }: { value: number; label?: string; className?: string }) {
  const up = value >= 0;
  return (
    <p className={`text-xs ${className}`} style={{ color: up ? "var(--positive)" : "var(--negative)" }}>
      {up ? "▲" : "▼"} {new Intl.NumberFormat("es-ES", {
        style: "percent", maximumFractionDigits: 0, signDisplay: "never",
      }).format(Math.abs(value))}
      {label && <span style={{ color: "var(--foreground-muted)" }}> {label}</span>}
    </p>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const c = TONES[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

export type Tone = "neutral" | "positive" | "negative" | "warning" | "brand";
const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral:  { bg: "var(--surface-sunken)", fg: "var(--foreground-muted)" },
  positive: { bg: "color-mix(in srgb, var(--positive) 15%, transparent)", fg: "var(--positive)" },
  negative: { bg: "color-mix(in srgb, var(--negative) 15%, transparent)", fg: "var(--negative)" },
  warning:  { bg: "color-mix(in srgb, var(--warning) 18%, transparent)",  fg: "var(--warning)" },
  brand:    { bg: "var(--brand-50)", fg: "var(--brand-600)" },
};

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b">
            {head.map((h, i) => (
              <th
                key={h}
                className={`pb-2 text-xs font-medium ${i === 0 ? "text-left" : "text-right"}`}
                style={{ color: "var(--foreground-muted)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b last:border-0">{children}</tr>;
}

export function Cell({
  children, align = "right", muted = false,
}: { children: ReactNode; align?: "left" | "right"; muted?: boolean }) {
  return (
    <td
      className={`py-2.5 ${align === "left" ? "text-left" : "text-right tabular"}`}
      style={muted ? { color: "var(--foreground-muted)" } : undefined}
    >
      {children}
    </td>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-xs" style={{ color: "var(--foreground-muted)" }}>{hint}</p>}
    </div>
  );
}
