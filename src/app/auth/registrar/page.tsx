"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

type CaptchaResponse = {
  question: string;
  token: string;
};

export default function RegisterPage() {
  const r = useRouter();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCaptcha() {
    const res = await fetch("/api/auth/captcha", { cache: "no-store" });
    const data = (await res.json()) as CaptchaResponse;
    setCaptchaQuestion(data.question);
    setCaptchaToken(data.token);
    setCaptchaAnswer("");
  }

  useEffect(() => {
    void loadCaptcha();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isStrongPassword(password.trim())) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, nickname, email, password, captchaToken, captchaAnswer }),
    });
    setLoading(false);
    if (res.ok) {
      r.push("/");
      r.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "Error al registrar");
      await loadCaptcha();
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
            <div className="mt-1 relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                className="w-full h-10 pl-3 pr-10 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 px-3 text-sm opacity-70 hover:opacity-100"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>
          <p className="text-xs opacity-70">Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.</p>

          <label className="block">
            <span className="text-sm">Captcha ({captchaQuestion || "cargando..."})</span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                required
                value={captchaAnswer}
                onChange={e => setCaptchaAnswer(e.target.value)}
                className="flex-1 h-10 px-3 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
              />
              <button
                type="button"
                onClick={() => void loadCaptcha()}
                className="h-10 px-3 rounded-md border border-border text-sm"
              >
                Cambiar
              </button>
            </div>
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

        <a
          href="/api/auth/google/start"
          className="mt-3 w-full h-10 inline-flex items-center justify-center rounded-full border border-border text-sm"
        >
          Crear con Google
        </a>

        <p className="text-sm opacity-80 mt-4">
          ¿Ya tienes cuenta? <a href="/auth/login" className="underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
