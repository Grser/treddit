import Link from "next/link";
import { cookies } from "next/headers";

import Feed from "@/components/Feed";
import Navbar from "@/components/Navbar";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import { getSessionUser } from "@/lib/auth";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

export const dynamic = "force-dynamic";

type TrendingTag = { tag: string; count: number; views: number };

type DiscoveryResponse = {
  recommendedUsers: {
    id: number;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
    is_admin?: boolean;
    is_verified?: boolean;
  }[];
  trendingTags: TrendingTag[];
};

type CommunityListResponse = {
  items: {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
    role?: string | null;
    members?: number;
  }[];
};

export default async function ExplorePage() {
  const session = await getSessionUser();
  const baseUrl = await getRequestBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join("; ") || undefined;

  const [discovery, popularCommunities, myCommunities] = await Promise.all([
    getDiscovery(baseUrl, cookieHeader),
    getPopularCommunities(baseUrl, cookieHeader),
    getMyCommunities(baseUrl, cookieHeader),
  ]);
  const followedCommunityIds = new Set(myCommunities.items.map((community) => Number(community.id)));
  const suggestedCommunities = popularCommunities.items.filter((community) => !followedCommunityIds.has(Number(community.id)));
  const sidebarCommunities = [...myCommunities.items, ...suggestedCommunities].slice(0, 12);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={session} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:grid-cols-[13.5rem_minmax(0,1fr)_19rem]">
        <SidebarLeft communities={sidebarCommunities} popularCommunities={popularCommunities.items} />

        <main className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h1 className="text-3xl font-semibold tracking-tight">Descubrir comunidades</h1>
            <p className="mt-2 text-sm opacity-75">
              Primero verás las comunidades que sigues con su actividad más reciente. Después, nuevas recomendaciones para explorar.
            </p>
            {session && (
              <Link href="/crear" className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-110">
                Crear comunidad
              </Link>
            )}
          </section>

          {myCommunities.items.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Tus comunidades</h2>
                <span className="rounded-full border border-border px-3 py-1 text-xs">{myCommunities.items.length} seguidas</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {myCommunities.items.map((community) => (
                  <Link key={community.id} href={`/c/${community.slug}`} className="rounded-xl border border-border/70 bg-background/40 p-4 transition hover:border-brand/40 hover:bg-background/70">
                    <p className="text-base font-semibold">{community.name}</p>
                    <p className="mt-1 text-xs opacity-70">/c/{community.slug}</p>
                    {community.role && <p className="mt-2 text-xs text-brand/90">Rol: {community.role}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {suggestedCommunities.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Nuevas comunidades para ti</h2>
                <span className="rounded-full border border-border px-3 py-1 text-xs">Descubrir</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestedCommunities.slice(0, 8).map((community) => (
                  <Link key={community.id} href={`/c/${community.slug}`} className="rounded-xl border border-border/70 bg-background/40 p-4 transition hover:border-brand/40 hover:bg-background/70">
                    <p className="text-base font-semibold">{community.name}</p>
                    <p className="mt-1 text-xs opacity-70">/c/{community.slug}</p>
                    <p className="mt-2 text-xs opacity-75">{Number(community.members || 0).toLocaleString()} miembros</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Publicaciones para descubrir</h2>
            <Feed canInteract={Boolean(session)} filter="exploring" />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <ul className="space-y-3">
              {discovery.trendingTags.map((item, idx) => (
                <li key={item.tag} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase opacity-60">#{idx + 1} en tendencias</p>
                    <Link href={`/buscar?q=${encodeURIComponent(item.tag)}`} className="text-lg font-semibold text-brand hover:underline">
                      {item.tag}
                    </Link>
                  </div>
                  <div className="text-right text-xs opacity-75">
                    <p>{item.views.toLocaleString()} vistas</p>
                    <p>{item.count.toLocaleString()} menciones</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <SidebarRight
          trending={discovery.trendingTags}
          recommended={discovery.recommendedUsers}
          canInteract={Boolean(session)}
        />
      </div>
    </div>
  );
}

async function getDiscovery(baseUrl: string, cookieHeader?: string): Promise<DiscoveryResponse> {
  const res = await fetch(`${baseUrl}/api/discovery`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return { recommendedUsers: [], trendingTags: [] };
  return (await res.json()) as DiscoveryResponse;
}

async function getPopularCommunities(baseUrl: string, cookieHeader?: string): Promise<CommunityListResponse> {
  const res = await fetch(`${baseUrl}/api/communities/popular`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as CommunityListResponse;
}

async function getMyCommunities(baseUrl: string, cookieHeader?: string): Promise<CommunityListResponse> {
  const res = await fetch(`${baseUrl}/api/communities/mine`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as CommunityListResponse;
}
