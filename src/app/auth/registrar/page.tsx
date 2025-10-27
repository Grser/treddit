"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const r = useRouter();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, nickname, email, password }),
    });
    setLoading(false);
    if (res.ok) {
      r.push("/");
      r.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "Error al registrar");
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="w-full max-w-md border border-border bg-surface rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Crear cuenta</h1>
        <p className="text-sm opacity-80 mb-4">Crea tu cuenta para participar en la comunidad.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Usuario</span>
            <input
              type="text" required value={username} onChange={e => setUsername(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Nombre visible</span>
            <input
              type="text" required value={nickname} onChange={e => setNickname(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
            />
          </label>
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
            Registrarse
          </button>
        </form>

        <p className="text-sm opacity-80 mt-4">
          ¿Ya tienes cuenta? <a href="/auth/login" className="underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}


