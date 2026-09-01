import { LoginForm } from "./form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      {/* El destino se lee en el servidor: usar useSearchParams aquí obligaría
          a renderizar el formulario en cliente y la página saldría en blanco
          hasta que cargara el JS. */}
      <LoginForm next={next?.startsWith("/") ? next : "/"} />
    </main>
  );
}
