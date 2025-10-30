"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RecoverPage() {
  const r = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/auth/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Si el correo existe, enviamos un código de recuperación.");
      setStep("verify");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "No se pudo enviar el código");
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Contraseña actualizada. Ahora puedes iniciar sesión.");
      setTimeout(() => {
        r.push("/auth/login");
        r.refresh();
      }, 1200);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "No se pudo actualizar la contraseña");
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="w-full max-w-md border border-border bg-surface rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
          <p className="text-sm opacity-80">
            Te enviaremos un código a tu correo para restablecer tu contraseña.
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequest} className="space-y-3">
            <label className="block">
              <span className="text-sm">Correo electrónico</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-full bg-brand text-white text-sm disabled:opacity-60"
            >
              Enviar código
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label className="block">
                <span className="text-sm">Código de verificación</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
                />
              </label>
              <p className="text-xs opacity-70 mt-1">
                Revisa tu correo e ingresa el código de 6 dígitos que recibiste.
              </p>
            </div>
            <label className="block">
              <span className="text-sm">Nueva contraseña</span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-full bg-brand text-white text-sm disabled:opacity-60"
            >
              Actualizar contraseña
            </button>
          </form>
        )}

        <p className="text-sm opacity-80">
          ¿Recordaste tu contraseña? <a href="/auth/login" className="underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
