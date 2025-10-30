"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      r.push("/");
      r.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="w-full max-w-md border border-border bg-surface rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm opacity-80 mb-4">Accede para poder publicar, comentar y dar me gusta.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Contraseña</span>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-full bg-brand text-white text-sm disabled:opacity-60"
          >
            Entrar
          </button>
        </form>
        <div className="mt-3 space-y-3">
          <a
            href="/api/auth/google/start"
            className="w-full h-10 inline-flex items-center justify-center rounded-full border border-border text-sm"
          >
            Continuar con Google
          </a>
          <div className="flex items-center justify-between text-sm opacity-80">
            <a href="/auth/recuperar" className="underline">
              ¿Olvidaste tu contraseña?
            </a>
            <a href="/auth/registrar" className="underline">
              Crear cuenta
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
