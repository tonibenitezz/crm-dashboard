"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Field({
  label, name, type = "text", defaultValue, required, min, step, hint, children,
}: {
  label: string; name: string; type?: string;
  defaultValue?: string | number; required?: boolean;
  min?: number; step?: string; hint?: string; children?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      {children ?? (
        <input
          name={name} type={type} defaultValue={defaultValue} required={required}
          min={min} step={step}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
          style={{ background: "var(--surface)" }}
        />
      )}
      {hint && (
        <span className="mt-1 block text-xs" style={{ color: "var(--foreground-muted)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function Select({
  label, name, options, defaultValue, required, placeholder,
}: {
  label: string; name: string;
  options: { value: string; label: string }[];
  defaultValue?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <Field label={label} name={name}>
      <select
        name={name} defaultValue={defaultValue ?? ""} required={required}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
        style={{ background: "var(--surface)" }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit" disabled={pending}
      className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      style={{ background: "var(--brand-500)" }}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } | null }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role="status"
      className="rounded-lg px-3 py-2 text-sm"
      style={
        state.error
          ? { background: "color-mix(in srgb, var(--negative) 12%, transparent)", color: "var(--negative)" }
          : { background: "color-mix(in srgb, var(--positive) 12%, transparent)", color: "var(--positive)" }
      }
    >
      {state.error ?? state.ok}
    </p>
  );
}
