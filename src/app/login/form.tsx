"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <form action={action} className="w-full max-w-sm space-y-4">
      <div className="mb-8">
        {/* Sustituir por el logo de marca */}
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
          style={{ background: "var(--brand-500)" }}
        >
          C
        </div>
        <h1 className="text-xl font-semibold">Entrar al CRM</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
          Acceso solo para el equipo.
        </p>
      </div>

      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="text-xs font-medium">Email</span>
        <input
          name="email" type="email" required autoComplete="email"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
          style={{ background: "var(--surface)" }}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium">Contraseña</span>
        <input
          name="password" type="password" required autoComplete="current-password"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
          style={{ background: "var(--surface)" }}
        />
      </label>

      {state?.error && (
        <p className="text-sm" style={{ color: "var(--negative)" }} role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: "var(--brand-500)" }}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
