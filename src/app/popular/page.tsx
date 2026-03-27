import { cookies } from "next/headers";

import Feed from "@/components/Feed";
import Navbar from "@/components/Navbar";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import { getSessionUser } from "@/lib/auth";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

export const dynamic = "force-dynamic";

type DiscoveryResponse = {
  recommendedUsers: {
    id: number;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
    is_admin?: boolean;
    is_verified?: boolean;
  }[];
  trendingTags: { tag: string; count: number; views?: number }[];
};

type CommunityListResponse = { items: { id: number; slug: string; name: string }[] };

export default async function PopularPage() {
  const me = await getSessionUser();
  const base = await getRequestBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join("; ") || undefined;

  const [discovery, popularCommunities] = await Promise.all([
    getDiscovery(base, cookieHeader),
    getCommunities(base, cookieHeader, false),
  ]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={me} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_20rem]">
        <SidebarLeft communities={popularCommunities.items} />

        <main className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h1 className="text-3xl font-semibold tracking-tight">Popular</h1>
            <p className="mt-2 text-sm opacity-75">Se muestran los posts con más likes. El ranking considera hasta 1000 publicaciones.</p>
          </section>
          <Feed canInteract={Boolean(me)} filter="popular" limit={30} />
        </main>

        <SidebarRight
          trending={discovery.trendingTags}
          recommended={discovery.recommendedUsers}
          canInteract={Boolean(me)}
        />
      </div>
    </div>
  );
}

async function getDiscovery(base: string, cookieHeader?: string): Promise<DiscoveryResponse> {
  const res = await fetch(`${base}/api/discovery`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return { recommendedUsers: [], trendingTags: [] };
  return (await res.json()) as DiscoveryResponse;
}

async function getCommunities(base: string, cookieHeader?: string, useMine = false): Promise<CommunityListResponse> {
  const path = useMine ? "/api/communities/mine" : "/api/communities/popular";
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as CommunityListResponse;
}
