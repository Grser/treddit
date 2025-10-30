import Link from "next/link";
import { cookies } from "next/headers";

import Navbar from "@/components/Navbar";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "pt", label: "Portugués" },
];

export const dynamic = "force-dynamic";

type LanguagePageProps = {
  searchParams: { actualizado?: string };
};

export default async function LanguagePage({ searchParams }: LanguagePageProps) {
  const cookieStore = await cookies();
  const current = cookieStore.get("treddit_lang")?.value || "es";
  const success = searchParams.actualizado === "1";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Preferencias de idioma</h1>
          <p className="text-sm opacity-70">
            Selecciona el idioma en el que prefieres usar Treddit. Guardamos tu elección en una cookie durante un año.
          </p>
        </header>

        {success && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Idioma actualizado correctamente.
          </div>
        )}

        <form method="post" className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold uppercase tracking-wide opacity-70">
              Idioma predeterminado
            </legend>
            {LANGUAGES.map((lang) => (
              <label
                key={lang.code}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 hover:border-brand/50"
              >
                <span className="text-sm font-medium">{lang.label}</span>
                <input
                  type="radio"
                  name="language"
                  value={lang.code}
                  defaultChecked={lang.code === current}
                  className="size-4"
                />
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-medium text-white hover:brightness-110"
            >
              Guardar cambios
            </button>
            <Link href="/" className="text-sm text-blue-400 hover:underline">
              Volver al inicio
            </Link>
          </div>
        </form>

        <section className="rounded-xl border border-border bg-surface p-6 text-sm opacity-80">
          <h2 className="text-lg font-semibold text-foreground">¿Falta tu idioma?</h2>
          <p className="mt-2">
            Estamos trabajando para admitir más idiomas. Escríbenos a {" "}
            <a href="mailto:soporte@treddit.com" className="text-blue-400 hover:underline">
              soporte@treddit.com
            </a>{" "}
            y cuéntanos cuál te gustaría ver.
          </p>
        </section>
      </main>
    </div>
  );
}
