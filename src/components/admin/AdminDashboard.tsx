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
    { href: "/admin/users", title: t.links.users.title, description: t.links.users.description, emoji: "👥" },
    { href: "/admin/posts", title: t.links.posts.title, description: t.links.posts.description, emoji: "📝" },
    { href: "/admin/communities", title: t.links.communities.title, description: t.links.communities.description, emoji: "🏘️" },
    { href: "/admin/anuncios", title: t.links.ads.title, description: t.links.ads.description, emoji: "📣" },
    { href: "/admin/users#verification", title: t.links.verification.title, description: t.links.verification.description, emoji: "✅" },
  ];

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-border bg-gradient-to-br from-surface to-brand/10 p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm opacity-75">{t.subtitle}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">{t.statsTitle}</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.stats.users} value={stats.users} accent="from-sky-500/15 to-sky-500/5" />
          <StatCard label={t.stats.posts} value={stats.posts} accent="from-fuchsia-500/15 to-fuchsia-500/5" />
          <StatCard label={t.stats.communities} value={stats.communities} accent="from-emerald-500/15 to-emerald-500/5" />
          <StatCard label={t.stats.moderators} value={stats.moderators} accent="from-amber-500/15 to-amber-500/5" />
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t.quickLinks}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow"
            >
              <h3 className="flex items-center gap-2 text-base font-semibold group-hover:text-brand">
                <span aria-hidden>{link.emoji}</span>
                {link.title}
              </h3>
              <p className="mt-1 text-sm opacity-75">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${accent} p-4`}>
      <dt className="text-sm opacity-70">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}
