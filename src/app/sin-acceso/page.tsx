import { signOut } from "@/app/login/actions";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Tu cuenta aún no está dada de alta</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--foreground-muted)" }}>
          Has entrado correctamente, pero no hay ninguna ficha de equipo asociada a
          este email. Pídele a un administrador que te añada.
        </p>
        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm underline" style={{ color: "var(--foreground-muted)" }}>
            Salir
          </button>
        </form>
      </div>
    </main>
  );
}
