import { cookies } from "next/headers";

import Navbar from "@/components/Navbar";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import Composer from "@/components/Composer";
import AuthBanner from "@/components/AuthBanner";
import { getSessionUser } from "@/lib/auth";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";
import Feed from "@/components/Feed";
import StoriesNotesBar from "@/components/StoriesNotesBar";
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



type StoryResponse = {
  items: {
    id: number;
    userId: number;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
    content: string | null;
    media_url: string;
    created_at: string;
  }[];
};

type CommunityListResponse = {
  items: {
    id: number;
    slug: string;
    name: string;
  }[];
};

type RequestStrategy = {
  includeCookies?: boolean;
  revalidateSeconds?: number;
};

function withCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) return undefined;
  return { Cookie: cookieHeader };
}

async function getFeed(
  base: string,
  cookieHeader?: string,
  strategy: RequestStrategy = {},
): Promise<FeedResponse> {
  const { includeCookies = true, revalidateSeconds } = strategy;
  const res = await fetch(`${base}/api/posts`, {
    cache: revalidateSeconds ? "force-cache" : "no-store",
    ...(revalidateSeconds ? { next: { revalidate: revalidateSeconds } } : {}),
    headers: includeCookies ? withCookieHeader(cookieHeader) : undefined,
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as FeedResponse;
}
async function getDiscovery(
  base: string,
  cookieHeader?: string,
  strategy: RequestStrategy = {},
): Promise<DiscoveryResponse> {
  const { includeCookies = true, revalidateSeconds } = strategy;
  const res = await fetch(`${base}/api/discovery`, {
    cache: revalidateSeconds ? "force-cache" : "no-store",
    ...(revalidateSeconds ? { next: { revalidate: revalidateSeconds } } : {}),
    headers: includeCookies ? withCookieHeader(cookieHeader) : undefined,
  });
  if (!res.ok)
    return { recommendedUsers: [], trendingTags: [] } satisfies DiscoveryResponse;
  return (await res.json()) as DiscoveryResponse;
}

async function getStories(
  base: string,
  cookieHeader?: string,
  strategy: RequestStrategy = {},
): Promise<StoryResponse> {
  const { includeCookies = true, revalidateSeconds } = strategy;
  const res = await fetch(`${base}/api/stories`, {
    cache: revalidateSeconds ? "force-cache" : "no-store",
    ...(revalidateSeconds ? { next: { revalidate: revalidateSeconds } } : {}),
    headers: includeCookies ? withCookieHeader(cookieHeader) : undefined,
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as StoryResponse;
}

async function getCommunities(
  base: string,
  cookieHeader?: string,
  useMine = false,
  strategy: RequestStrategy = {},
): Promise<CommunityListResponse> {
  const { includeCookies = true, revalidateSeconds } = strategy;
  const path = useMine ? "/api/communities/mine" : "/api/communities/popular";
  const res = await fetch(`${base}${path}`, {
    cache: revalidateSeconds ? "force-cache" : "no-store",
    ...(revalidateSeconds ? { next: { revalidate: revalidateSeconds } } : {}),
    headers: includeCookies ? withCookieHeader(cookieHeader) : undefined,
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as CommunityListResponse;
}

export default async function Page() {
  const base = await getRequestBaseUrl();
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has("treddit_token");
  const cookieHeader = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join("; ") || undefined;
  const sessionPromise = getSessionUser();
  const feedPromise = getFeed(base, cookieHeader, {
    includeCookies: hasSessionCookie,
    revalidateSeconds: hasSessionCookie ? undefined : 20,
  });
  const discoveryPromise = getDiscovery(base, cookieHeader, {
    includeCookies: hasSessionCookie,
    revalidateSeconds: hasSessionCookie ? undefined : 30,
  });
  const storiesPromise = getStories(base, cookieHeader, {
    includeCookies: hasSessionCookie,
    revalidateSeconds: hasSessionCookie ? undefined : 30,
  });
  const communitiesPromise = getCommunities(base, cookieHeader, hasSessionCookie, {
    includeCookies: hasSessionCookie,
    revalidateSeconds: hasSessionCookie ? undefined : 60,
  });

  const [session, { items }, discovery, stories, initialCommunities] = await Promise.all([
    sessionPromise,
    feedPromise,
    discoveryPromise,
    storiesPromise,
    communitiesPromise,
  ]);

  const communities = !session && hasSessionCookie
    ? await getCommunities(base, cookieHeader, false, { includeCookies: false, revalidateSeconds: 60 })
    : initialCommunities;

  const canInteract = Boolean(session);

  return (
    <div className="min-h-dvh">
      <Navbar session={session} />
      <div className="mx-auto max-w-7xl px-3 sm:px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] lg:grid-cols-[16rem_1fr_20rem] gap-4 py-4">
        <SidebarLeft communities={communities.items} />

        <main className="space-y-4">
          {!canInteract && <AuthBanner />}
          <StoriesNotesBar
            canInteract={canInteract}
            me={session}
            users={stories.items.map((story) => ({
              id: story.userId,
              username: story.username,
              nickname: story.nickname,
              avatar_url: story.avatar_url,
              content: story.content,
              media_url: story.media_url,
              created_at: story.created_at,
            }))}
          />
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
