"use client";

import Link from "next/link";

import { useLocale } from "@/contexts/LocaleContext";

export type AdminStats = {
  users: number;
  posts: number;
  communities: number;
  moderators: number;
};

export default function AdminDashboard({ stats }: { stats: AdminStats }) {
  const { strings } = useLocale();
  const t = strings.adminPage;

  const quickLinks = [
    {
      href: "/admin/users",
      title: t.links.users.title,
      description: t.links.users.description,
      badge: "Identity",
      icon: <UsersIcon />,
    },
    {
      href: "/admin/posts",
      title: t.links.posts.title,
      description: t.links.posts.description,
      badge: "Content",
      icon: <PostsIcon />,
    },
    {
      href: "/admin/communities",
      title: t.links.communities.title,
      description: t.links.communities.description,
      badge: "Community",
      icon: <CommunitiesIcon />,
    },
    {
      href: "/admin/groups",
      title: t.links.groups.title,
      description: t.links.groups.description,
      badge: "Messaging",
      icon: <GroupsIcon />,
    },
    { href: "/admin/anuncios", title: t.links.ads.title, description: t.links.ads.description, badge: "Growth", icon: <AdsIcon /> },
    {
      href: "/admin/users#verification",
      title: t.links.verification.title,
      description: t.links.verification.description,
      badge: "Trust & Safety",
      icon: <VerificationIcon />,
    },
    {
      href: "/admin/reports",
      title: "Reportes",
      description: "Revisa reportes de cuentas y posts en un centro de incidentes unificado.",
      badge: "Incidents",
      icon: <ReportsIcon />,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-brand/20 via-brand/10 to-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{t.title}</p>
          <h2 className="mt-3 text-2xl font-semibold">Centro operativo</h2>
          <p className="mt-2 text-sm opacity-75">{t.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/reports" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90">
              Ir a incidentes
            </Link>
            <Link href="/admin/users" className="rounded-full border border-border bg-surface/80 px-4 py-2 text-sm hover:border-brand/40">
              Revisar usuarios
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <KpiCard label={t.stats.users} value={stats.users} helper="Cuentas visibles" accent="from-sky-500/30 to-sky-500/5" />
          <KpiCard label={t.stats.posts} value={stats.posts} helper="Contenido publicado" accent="from-violet-500/30 to-violet-500/5" />
          <KpiCard label={t.stats.communities} value={stats.communities} helper="Espacios activos" accent="from-emerald-500/30 to-emerald-500/5" />
          <KpiCard label={t.stats.moderators} value={stats.moderators} helper="Con permisos avanzados" accent="from-amber-500/30 to-amber-500/5" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{t.quickLinks}</h3>
          <span className="text-xs uppercase tracking-[0.15em] opacity-60">Workflows</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">{link.badge}</p>
              <h4 className="mt-2 flex items-center gap-2 text-base font-semibold group-hover:text-brand">
                <span aria-hidden>{link.icon}</span>
                {link.title}
              </h4>
              <p className="mt-2 text-sm opacity-75">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
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

function AdsIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h6M7 16h4" />
    </svg>
  );
}

function VerificationIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m20 7-8.5 13L4 14" />
      <path d="M12 3 4 7v5c0 4.5 3.1 7.9 8 9 4.9-1.1 8-4.5 8-9V7z" />
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

function KpiCard({ label, value, helper, accent }: { label: string; value: number; helper: string; accent: string }) {
  return (
    <article className={`rounded-2xl border border-border bg-gradient-to-br ${accent} p-4`}>
      <p className="text-xs uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-semibold leading-none">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs opacity-70">{helper}</p>
    </article>
  );
}
