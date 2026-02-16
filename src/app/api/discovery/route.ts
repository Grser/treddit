// src/app/api/discovery/route.ts
import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getDemoRecommendedUsers, getDemoTrendingTags } from "@/lib/demoStore";

type DiscoveryUserRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
};

type DiscoveryUser = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_verified: boolean;
};

type TrendingTag = { tag: string; count: number; views: number };

const TRENDING_TTL_MS = 30_000;
const globalForDiscovery = globalThis as unknown as {
  __tredditTrendingCache?: { expiresAt: number; items: TrendingTag[] };
};

const DISCOVERY_ANON_TTL_MS = 30_000;
const globalForDiscoveryResponse = globalThis as unknown as {
  __tredditDiscoveryAnonCache?: { expiresAt: number; payload: { recommendedUsers: DiscoveryUser[]; trendingTags: TrendingTag[] } };
};

// extrae hashtags tipo #algo
function extractHashtags(text?: string | null) {
  if (!text) return [] as string[];
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return tags.map((t) => t.toLowerCase());
}

async function getTrendingTagsCached(): Promise<TrendingTag[]> {
  const now = Date.now();
  const cached = globalForDiscovery.__tredditTrendingCache;

  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  const [posts] = await db.query<(RowDataPacket & { id: number; description: string | null })[]>(
    `
    SELECT p.id, p.description
    FROM Posts p
    ORDER BY p.created_at DESC
    LIMIT 200
    `
  );

  const freq = new Map<string, number>();
  posts.forEach((p) => {
    extractHashtags(p.description ?? undefined).forEach((tag) => {
      freq.set(tag, (freq.get(tag) || 0) + 1);
    });
  });

  const items = [...freq.entries()]
    .map(([tag, count]) => ({ tag, count, views: count }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  globalForDiscovery.__tredditTrendingCache = {
    expiresAt: now + TRENDING_TTL_MS,
    items,
  };

  return items;
}

export async function GET() {
  const me = await getSessionUser();

  if (!me) {
    const cached = globalForDiscoveryResponse.__tredditDiscoveryAnonCache;
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
      });
    }
  }

  if (!isDatabaseConfigured()) {
    const recommendedUsers = getDemoRecommendedUsers(me?.id);
    const trendingTags = getDemoTrendingTags(5).map((item) => ({
      tag: item.tag,
      count: item.count,
      views: item.views,
    }));

    return NextResponse.json({
      recommendedUsers: recommendedUsers.map((user) => ({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin,
        is_verified: user.is_verified,
      })),
      trendingTags,
    });
  }

  const usersQuery = db.query<DiscoveryUserRow[]>(
    `
    SELECT u.id, u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified
    FROM Users u
    WHERE u.visible = 1
      ${me ? "AND u.id <> ?" : ""}
      ${me ? "AND u.id NOT IN (SELECT followed FROM Follows WHERE follower = ?)" : ""}
    ORDER BY u.created_at DESC
    LIMIT 8
    `,
    me ? [me.id, me.id] : []
  );

  const [[users], trendingTags] = await Promise.all([usersQuery, getTrendingTagsCached()]);

  const recommendedUsers: DiscoveryUser[] = users.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    is_admin: Boolean(row.is_admin),
    is_verified: Boolean(row.is_verified),
  }));

  const payload = {
    recommendedUsers,
    trendingTags,
  };

  if (!me) {
    globalForDiscoveryResponse.__tredditDiscoveryAnonCache = {
      expiresAt: Date.now() + DISCOVERY_ANON_TTL_MS,
      payload,
    };
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": me ? "no-store" : "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
