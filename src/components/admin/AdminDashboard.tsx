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
    { href: "/admin/users", title: t.links.users.title, description: t.links.users.description },
    { href: "/admin/posts", title: t.links.posts.title, description: t.links.posts.description },
    { href: "/admin/communities", title: t.links.communities.title, description: t.links.communities.description },
    { href: "/admin/users#verification", title: t.links.verification.title, description: t.links.verification.description },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm opacity-70">{t.subtitle}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">{t.statsTitle}</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <StatCard label={t.stats.users} value={stats.users} />
          <StatCard label={t.stats.posts} value={stats.posts} />
          <StatCard label={t.stats.communities} value={stats.communities} />
          <StatCard label={t.stats.moderators} value={stats.moderators} />
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t.quickLinks}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border bg-surface p-4 transition hover:border-brand/60 hover:shadow"
            >
              <h3 className="text-base font-semibold group-hover:text-brand">{link.title}</h3>
              <p className="mt-1 text-sm opacity-70">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="text-sm opacity-70">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}
