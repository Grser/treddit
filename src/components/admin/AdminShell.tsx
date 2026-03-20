import type { ReactNode } from "react";

export function AdminShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="rounded-2xl border border-border bg-gradient-to-br from-surface to-brand/10 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm opacity-75">{subtitle}</p>
      </header>
      {children}
    </main>
  );
}

export function AdminSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm opacity-70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
