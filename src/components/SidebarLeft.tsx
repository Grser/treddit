"use client";

import Link from "next/link";

import { useLocale } from "@/contexts/LocaleContext";

export default function SidebarLeft({ communities = [] as string[] }) {
  const { strings } = useLocale();
  const t = strings.sidebarLeft;

  return (
    <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r border-border">
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
        {communities.map((tag) => {
          const normalized = tag.startsWith("#") ? tag : `#${tag}`;
          const href = `/buscar?q=${encodeURIComponent(normalized)}`;
          return (
            <Link key={tag} href={href} className="px-3 py-2 hover:bg-muted/60 rounded-lg">
              {normalized}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
