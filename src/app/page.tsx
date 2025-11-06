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

async function getFeed(base: string, cookieHeader?: string): Promise<FeedResponse> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }
  const res = await fetch(`${base}/api/posts`, { cache: "no-store", headers });
  if (!res.ok) return { items: [] };
  return (await res.json()) as FeedResponse;
}
async function getDiscovery(base: string, cookieHeader?: string): Promise<DiscoveryResponse> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }
  const res = await fetch(`${base}/api/discovery`, { cache: "no-store", headers });
  if (!res.ok)
    return { recommendedUsers: [], trendingTags: [] } satisfies DiscoveryResponse;
  return (await res.json()) as DiscoveryResponse;
}

export default async function Page() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cookieStore = cookies();
  const cookieHeader = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join("; ") || undefined;
  const session = await getSessionUser();
  const [{ items }, discovery] = await Promise.all([
    getFeed(base, cookieHeader),
    getDiscovery(base, cookieHeader),
  ]);

  const canInteract = Boolean(session);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto max-w-7xl px-3 sm:px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] lg:grid-cols-[16rem_1fr_20rem] gap-4 py-4">
        <SidebarLeft communities={discovery.trendingTags.map((t) => t.tag)} />

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
