import type { ReactNode } from "react";

import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Overview", emoji: "🏠" },
  { href: "/admin/users", label: "Usuarios", emoji: "👥" },
  { href: "/admin/posts", label: "Posts", emoji: "📝" },
  { href: "/admin/communities", label: "Comunidades", emoji: "🏘️" },
  { href: "/admin/groups", label: "Grupos", emoji: "💬" },
  { href: "/admin/reports", label: "Reportes", emoji: "🚨" },
  { href: "/admin/anuncios", label: "Anuncios", emoji: "📣" },
  { href: "/admin/series", label: "Series", emoji: "🎬" },
];

export function AdminShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-border/70 bg-surface/95 p-4 shadow-sm backdrop-blur">
          <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/20 via-brand/10 to-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Treddit Admin</p>
            <p className="mt-2 text-sm opacity-80">Control total de moderación, seguridad y operaciones en un solo espacio.</p>
          </div>

          <nav className="mt-4 space-y-1">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition hover:border-brand/40 hover:bg-brand/10"
              >
                <span aria-hidden>{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <section className="space-y-5">
          <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-brand/10 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/90">Panel de administración</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm opacity-75">{subtitle}</p>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}

export function AdminSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-surface/95 p-5 shadow-sm backdrop-blur md:p-6">
      <div className="mb-5 border-b border-border/60 pb-4">
        <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm opacity-70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
