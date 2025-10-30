// src/app/api/discovery/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// extrae hashtags tipo #algo
function extractHashtags(text?: string | null) {
  if (!text) return [] as string[];
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return tags.map((t) => t.toLowerCase());
}

export async function GET() {
  const me = await getSessionUser();

  // recomendados: visibles, distintos a mí y que no sigo
  const [users] = await db.query(
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
  const [posts] = await db.query(
    `
    SELECT p.id, p.description
    FROM Posts p
    ORDER BY p.created_at DESC
    LIMIT 200
    `
  );

  const freq = new Map<string, number>();
  (posts as any[]).forEach((p) => {
    extractHashtags(p.description).forEach((tag) => {
      freq.set(tag, (freq.get(tag) || 0) + 1);
    });
  });

  const trendingTags = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({
    recommendedUsers: users,
    trendingTags,
  });
}
