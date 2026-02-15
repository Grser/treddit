import { cookies } from "next/headers";

import Navbar from "@/components/Navbar";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import Composer from "@/components/Composer";
import AuthBanner from "@/components/AuthBanner";
import { getSessionUser } from "@/lib/auth";
import Feed from "@/components/Feed";
import type { Post as PostCardType } from "@/components/PostCard";

type FeedResponse = { items: PostCardType[] };

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

type CommunityListResponse = {
  items: {
    id: number;
    slug: string;
    name: string;
  }[];
};

function withCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) return undefined;
  return { Cookie: cookieHeader };
}

async function getFeed(base: string, cookieHeader?: string): Promise<FeedResponse> {
  const res = await fetch(`${base}/api/posts`, { cache: "no-store", headers: withCookieHeader(cookieHeader) });
  if (!res.ok) return { items: [] };
  return (await res.json()) as FeedResponse;
}
async function getDiscovery(base: string, cookieHeader?: string): Promise<DiscoveryResponse> {
  const res = await fetch(`${base}/api/discovery`, { cache: "no-store", headers: withCookieHeader(cookieHeader) });
  if (!res.ok)
    return { recommendedUsers: [], trendingTags: [] } satisfies DiscoveryResponse;
  return (await res.json()) as DiscoveryResponse;
}

async function getCommunities(
  base: string,
  cookieHeader?: string,
  useMine = false,
): Promise<CommunityListResponse> {
  const path = useMine ? "/api/communities/mine" : "/api/communities/popular";
  const res = await fetch(`${base}${path}`, { cache: "no-store", headers: withCookieHeader(cookieHeader) });
  if (!res.ok) return { items: [] };
  return (await res.json()) as CommunityListResponse;
}

export default async function Page() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join("; ") || undefined;
  const sessionPromise = getSessionUser();
  const feedPromise = getFeed(base, cookieHeader);
  const discoveryPromise = getDiscovery(base, cookieHeader);

  const session = await sessionPromise;
  const [{ items }, discovery, communities] = await Promise.all([
    feedPromise,
    discoveryPromise,
    getCommunities(base, cookieHeader, Boolean(session)),
  ]);

  const canInteract = Boolean(session);

  return (
    <div className="min-h-dvh">
      <Navbar session={session} />
      <div className="mx-auto max-w-7xl px-3 sm:px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] lg:grid-cols-[16rem_1fr_20rem] gap-4 py-4">
        <SidebarLeft communities={communities.items} />

        <main className="space-y-4">
          {!canInteract && <AuthBanner />}
          <Composer enabled={canInteract} />

          <Feed canInteract={!!canInteract} initialItems={items} />
        </main>

        <SidebarRight
          trending={discovery.trendingTags}
          recommended={discovery.recommendedUsers}
          canInteract={canInteract}
        />
      </div>
    </div>
  );
}
