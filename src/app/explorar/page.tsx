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
    members?: number;
  }[];
};

export default async function ExplorePage() {
  const session = await getSessionUser();
  const baseUrl = await getRequestBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join("; ") || undefined;

  const [discovery, popularCommunities] = await Promise.all([
    getDiscovery(baseUrl, cookieHeader),
    getPopularCommunities(baseUrl, cookieHeader),
  ]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={session} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_20rem]">
        <SidebarLeft communities={popularCommunities.items} />

        <main className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h1 className="text-3xl font-semibold tracking-tight">Explorar</h1>
            <p className="mt-2 text-sm opacity-75">Aquí verás comunidades populares y publicaciones de gente nueva.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Gente que no sigues</h2>
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
          popularCommunities={popularCommunities.items}
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
