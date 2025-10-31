export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getDemoPosts } from "@/data/demoPosts";

export async function GET(req: Request) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 50);
  const cursor = url.searchParams.get("cursor");
  const params: any[] = [];
  let whereCursor = "";
  if (cursor) { whereCursor = "WHERE p.id < ?"; params.push(Number(cursor)); }

  const meId = me?.id ?? null;

  const fallback = () => {
    const items = getDemoPosts(limit);
    return NextResponse.json(
      { items, nextCursor: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  };

  if (!isDatabaseConfigured()) {
    return fallback();
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.user                                       AS user,
        u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified,
        p.description, p.created_at,
        (SELECT f.route FROM Files f WHERE f.postid=p.id ORDER BY f.id ASC LIMIT 1) AS mediaUrl,
        (SELECT COUNT(*) FROM Like_Posts lp WHERE lp.post=p.id) AS likes,
        (SELECT COUNT(*) FROM Comments  c  WHERE c.post=p.id) AS comments,
        (SELECT COUNT(*) FROM Reposts   r  WHERE r.post_id=p.id) AS reposts,
        EXISTS(SELECT 1 FROM Polls pl WHERE pl.post_id=p.id)     AS hasPoll,
        CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
          SELECT 1 FROM Like_Posts x WHERE x.post=p.id AND x.user=?
        ) END AS likedByMe,
        CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
          SELECT 1 FROM Reposts y WHERE y.post_id=p.id AND y.user_id=?
        ) END AS repostedByMe
      FROM Posts p
      JOIN Users u ON u.id = p.user
      ${whereCursor}
      ORDER BY p.id DESC
      LIMIT ?
      `,
      [meId, meId, meId, meId, ...params, limit + 1]
    );

    const list = rows as any[];
    const items = list.slice(0, limit);
    const nextCursor = list.length > limit ? String(items[items.length - 1].id) : null;

    return new NextResponse(JSON.stringify({ items, nextCursor }), {
      headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to load posts from database", error);
    return fallback();
  }
}
