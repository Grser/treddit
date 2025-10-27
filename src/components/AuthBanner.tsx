export default function AuthBanner() {
    return (
      <div className="border border-border bg-surface rounded-xl p-4">
        <h2 className="text-lg font-semibold">Crea una cuenta o inicia sesión</h2>
        <p className="text-sm opacity-80 mt-1">
          Puedes navegar sin cuenta, pero para comentar, dar me gusta o publicar necesitas iniciar sesión.
        </p>
        <div className="mt-3 flex gap-2">
          <a href="/auth/registrar" className="h-9 px-4 rounded-full bg-brand text-white text-sm inline-flex items-center">Registrarse</a>
          <a href="/auth/login" className="h-9 px-4 rounded-full border border-border text-sm inline-flex items-center">Iniciar sesión</a>
        </div>
      </div>
    );
  }
  