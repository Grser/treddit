"use client";

import Link from "next/link";

import { useLocale } from "@/contexts/LocaleContext";

type SidebarCommunity = {
  id: number;
  slug: string;
  name: string;
};

export default function SidebarLeft({ communities = [] as SidebarCommunity[] }) {
  const { strings } = useLocale();
  const t = strings.sidebarLeft;

  return (
    <aside className="hidden w-56 flex-col gap-2 border-r border-border p-4 lg:flex">
      <nav className="flex flex-col gap-2">
        <Link href="/" className="hover:bg-muted/60 rounded-lg px-3 py-2">
          {t.home}
        </Link>
        <Link href="/popular" className="hover:bg-muted/60 rounded-lg px-3 py-2">
          {t.popular}
        </Link>
        <Link href="/explorar" className="hover:bg-muted/60 rounded-lg px-3 py-2">
          {t.explore}
        </Link>
        <Link href="/crear" className="hover:bg-muted/60 rounded-lg px-3 py-2">
          {t.createCommunity}
        </Link>
      </nav>
      <hr className="my-3 border-border" />
      <p className="text-xs opacity-70 px-3">{t.communities}</p>
      <div className="flex flex-col">
        {communities.length === 0 && (
          <span className="px-3 py-2 text-sm opacity-60">{t.empty}</span>
        )}
        {communities.map((community) => {
          const href = `/c/${encodeURIComponent(community.slug)}`;
          return (
            <Link
              key={community.id}
              href={href}
              className="px-3 py-2 hover:bg-muted/60 rounded-lg"
              title={community.name}
            >
              c/{community.slug}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
