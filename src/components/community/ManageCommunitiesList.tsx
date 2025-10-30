"use client";

import Link from "next/link";

import { useLocale } from "@/contexts/LocaleContext";

type Community = {
  id: number;
  name: string;
  slug: string;
  role?: string | null;
};

export default function ManageCommunitiesList({ communities }: { communities: Community[] }) {
  const { strings } = useLocale();
  const t = strings.createCommunity;

  if (!communities?.length) {
    return (
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t.existingTitle}</h2>
        <p className="mt-1 text-sm opacity-70">{t.existingSubtitle}</p>
        <p className="mt-4 text-sm opacity-80">{t.empty}</p>
      </section>
    );
  }

  function roleLabel(role?: string | null) {
    if (!role) return null;
    const normalized = role.toLowerCase();
    if (normalized === "owner") return t.roleOwner;
    if (normalized === "admin" || normalized === "moderator") return t.roleModerator;
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{t.existingTitle}</h2>
      <p className="mt-1 text-sm opacity-70">{t.existingSubtitle}</p>

      <ul className="mt-4 space-y-3">
        {communities.map((community) => {
          const label = roleLabel(community.role);
          return (
            <li key={community.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{community.name}</p>
                <p className="text-xs opacity-70">treddit.com/c/{community.slug}</p>
                {label && <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80">{label}</span>}
              </div>
              <Link
                href={`/c/${community.slug}`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
              >
                {t.manage}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
