import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/lib/db";

type PopularCommunitiesPayload = {
  items: unknown[];
};

const POPULAR_COMMUNITIES_TTL_MS = 60_000;
const globalForPopularCommunities = globalThis as unknown as {
  __tredditPopularCommunitiesCache?: { expiresAt: number; payload: PopularCommunitiesPayload };
};

export async function GET() {
  const cached = globalForPopularCommunities.__tredditPopularCommunitiesCache;
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ items: [] }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name, COUNT(cm.user_id) as members
     FROM Communities c
     LEFT JOIN Community_Members cm ON cm.community_id = c.id
     WHERE c.visible = 1
     GROUP BY c.id
     ORDER BY members DESC, c.name ASC
     LIMIT 10`
  );

  const payload = { items: rows };
  globalForPopularCommunities.__tredditPopularCommunitiesCache = {
    expiresAt: Date.now() + POPULAR_COMMUNITIES_TTL_MS,
    payload,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
  });
}
