"use client";

import Link from "next/link";

import { useLocale } from "@/contexts/LocaleContext";

type SidebarCommunity = {
  id: number;
  slug: string;
  name: string;
  members?: number;
};

export default function SidebarLeft({
  communities = [] as SidebarCommunity[],
  popularCommunities = [] as SidebarCommunity[],
}: {
  communities?: SidebarCommunity[];
  popularCommunities?: SidebarCommunity[];
}) {
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
        {communities.slice(0, 5).map((community) => {
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
        {communities.length > 5 && (
          <Link href="/explorar" className="px-3 py-2 text-sm text-brand hover:underline">
            Ver todas
          </Link>
        )}
      </div>

      {popularCommunities.length > 0 && (
        <>
          <hr className="my-3 border-border" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <p className="text-xs opacity-70">{t.popularCommunities}</p>
              <Link href="/explorar" className="text-xs text-brand hover:underline">
                {t.top}
              </Link>
            </div>
            <div className="flex flex-col text-sm">
              {popularCommunities.slice(0, 5).map((community, idx) => (
                <Link
                  key={community.id}
                  href={`/c/${encodeURIComponent(community.slug)}`}
                  className="rounded-lg px-3 py-2 hover:bg-muted/60"
                  title={community.name}
                >
                  <p className="text-[11px] uppercase opacity-60">#{idx + 1}</p>
                  <p className="truncate font-medium">{community.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
