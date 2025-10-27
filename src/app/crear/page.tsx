import { getSessionUser } from "@/lib/auth";
import Composer from "@/components/Composer";
import Navbar from "@/components/Navbar";

export default async function CrearPage() {
  const session = await getSessionUser();

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto max-w-2xl p-4">
        {!session ? (
          <div className="border border-border bg-surface rounded-xl p-6">
            <h1 className="text-xl font-semibold">Inicia sesión para publicar</h1>
            <p className="text-sm opacity-80 mt-2">
              Para crear publicaciones necesitas una cuenta. Puedes navegar sin iniciar sesión desde la página principal.
            </p>
            <div className="mt-4 flex gap-2">
              <a href="/auth/login" className="h-9 px-4 rounded-full border border-border text-sm">Entrar</a>
              <a href="/auth/registrar" className="h-9 px-4 rounded-full bg-brand text-white text-sm">Registrarse</a>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-3">Crear publicación</h1>
            <Composer enabled />
          </>
        )}
      </div>
    </div>
  );
}
