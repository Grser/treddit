"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CaptchaResponse = {
  question: string;
  token: string;
};

function LoginForm() {
  const r = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [step, setStep] = useState<"credentials" | "two-factor">("credentials");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorHint, setTwoFactorHint] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const oauthError = searchParams.get("error");
  const oauthErrorMessage =
    oauthError === "google_oauth_config"
      ? "El acceso con Google no está configurado correctamente. Revisa GOOGLE_CLIENT_ID en variables de entorno."
      : oauthError === "google_oauth_redirect"
        ? "El callback OAuth de Google apunta a treddit.com. Configura GOOGLE_REDIRECT_URI con tu dominio público para evitar el Error 400 invalid_request."
        : null;

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

  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, captchaToken, captchaAnswer }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok && j?.requiresTwoFactor) {
      setStep("two-factor");
      setTwoFactorEmail(j?.email || email.trim().toLowerCase());
      setTwoFactorHint(j?.emailHint || "tu correo");
      setMessage(j?.message || "Código enviado.");
      setTwoFactorCode("");
      return;
    }

    if (res.ok) {
      r.push("/");
      r.refresh();
    } else {
      setError(j?.error || "Error al iniciar sesión");
      await loadCaptcha();
    }
  }

  async function onSubmitTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: twoFactorEmail, code: twoFactorCode }),
    });

    setLoading(false);
    if (res.ok) {
      r.push("/");
      r.refresh();
      return;
    }

    const j = await res.json().catch(() => ({}));
    setError(j?.error || "No se pudo verificar el código");
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="w-full max-w-md border border-border bg-surface rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm opacity-80 mb-4">Accede para poder publicar, comentar y dar me gusta.</p>

        {step === "credentials" ? (
          <form onSubmit={onSubmitCredentials} className="space-y-3">
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

            {(error || oauthErrorMessage) && <p className="text-sm text-red-400">{error || oauthErrorMessage}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-full bg-brand text-white text-sm disabled:opacity-60"
            >
              Entrar
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitTwoFactor} className="space-y-3">
            <p className="text-sm opacity-80">
              Verificación en 2 pasos activa. Ingresa el código de 6 dígitos enviado a <strong>{twoFactorHint}</strong>.
            </p>
            <label className="block">
              <span className="text-sm">Código de verificación</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
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
              Verificar e ingresar
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setMessage(null);
                setError(null);
              }}
              className="w-full h-10 rounded-full border border-border text-sm"
            >
              Volver
            </button>
          </form>
        )}

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh grid place-items-center" />}>
      <LoginForm />
    </Suspense>
  );
}
