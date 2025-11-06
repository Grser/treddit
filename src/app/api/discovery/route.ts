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

// extrae hashtags tipo #algo
function extractHashtags(text?: string | null) {
  if (!text) return [] as string[];
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return tags.map((t) => t.toLowerCase());
}

export async function GET() {
  const me = await getSessionUser();

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

  // recomendados: visibles, distintos a mí y que no sigo
  const [users] = await db.query<DiscoveryUserRow[]>(
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

  // hashtags desde posts recientes
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

  const recommendedUsers: DiscoveryUser[] = users.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    is_admin: Boolean(row.is_admin),
    is_verified: Boolean(row.is_verified),
  }));

  const trendingTags = [...freq.entries()]
    .map(([tag, count]) => ({ tag, count, views: count }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return NextResponse.json({
    recommendedUsers,
    trendingTags,
  });
}
