import type { ReactNode } from "react";

import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: <OverviewIcon /> },
  { href: "/admin/users", label: "Usuarios", icon: <UsersIcon /> },
  { href: "/admin/posts", label: "Posts", icon: <PostsIcon /> },
  { href: "/admin/communities", label: "Comunidades", icon: <CommunitiesIcon /> },
  { href: "/admin/groups", label: "Grupos", icon: <GroupsIcon /> },
  { href: "/admin/reports", label: "Reportes", icon: <ReportsIcon /> },
  { href: "/admin/anuncios", label: "Anuncios", icon: <AdsIcon /> },
  { href: "/admin/roles", label: "Roles", icon: <RolesIcon /> },
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
                <span aria-hidden>{link.icon}</span>
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

function OverviewIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12 12 4l9 8" />
      <path d="M5 10.5V20h14v-9.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2" />
      <path d="M15 19a4 4 0 0 1 6 0" />
    </svg>
  );
}

function PostsIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function CommunitiesIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 20h18" />
      <path d="M5 20V9.5L12 5l7 4.5V20" />
      <path d="M10 20v-4h4v4" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 9v4" />
      <circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none" />
      <path d="M10.3 3.8 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

function AdsIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h6M7 16h4" />
    </svg>
  );
}


function RolesIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="M10.5 10.5 13.5 13.5" />
      <path d="M3 21h8M13 3h8" />
    </svg>
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
