export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getPostsSensitiveColumn } from "@/lib/postSensitivity";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoFeed } from "@/lib/demoStore";
import { getPostsCommunityColumn } from "@/lib/communityColumns";

type SavedPostRow = {
  id: number;
  user: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number | boolean;
  is_verified: number | boolean;
  description: string | null;
  created_at: string | Date;
  reply_scope: number | null;
  mediaUrl: string | null;
  likes: number;
  comments: number;
  reposts: number;
  hasPoll: number;
  likedByMe: number;
  repostedByMe: number;
  community_id: number | null;
  community_slug: string | null;
  community_name: string | null;
  is_sensitive: number | boolean | null;
};

export async function GET(req: Request) {
  const me = await getSessionUser();
  const meId = me?.id ?? null;
  const url = new URL(req.url);

  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value, index, list) => Number.isInteger(value) && value > 0 && list.indexOf(value) === index)
    .slice(0, 100);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!isDatabaseConfigured()) {
    const allDemo = getDemoFeed({ limit: 100 }).items;
    const mapped = ids
      .map((id) => allDemo.find((item) => item.id === id))
      .filter((item): item is (typeof allDemo)[number] => Boolean(item));

    return NextResponse.json({ items: mapped }, { headers: { "Cache-Control": "no-store" } });
  }

  const placeholders = ids.map(() => "?").join(",");
  const communityColumn = await getPostsCommunityColumn();
  const sensitiveColumn = await getPostsSensitiveColumn();
  const hasCommunityColumn = Boolean(communityColumn);
  const hasSensitiveColumn = Boolean(sensitiveColumn);
  const communityIdSelect = hasCommunityColumn && communityColumn ? `p.${communityColumn}` : "NULL";
  const communityJoin = hasCommunityColumn && communityColumn ? `LEFT JOIN Communities c ON c.id = p.${communityColumn}` : "";
  const communitySlugSelect = hasCommunityColumn ? "c.slug" : "NULL";
  const communityNameSelect = hasCommunityColumn ? "c.name" : "NULL";
  const sensitiveSelect = hasSensitiveColumn ? "p.is_sensitive" : "0";

  try {
    const [rows] = await db.query<SavedPostRow[]>(
      `
      SELECT
        p.id,
        p.user AS user,
        u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified,
        p.description, p.created_at, p.reply_scope,
        (SELECT f.route FROM Files f WHERE f.postid=p.id ORDER BY f.id ASC LIMIT 1) AS mediaUrl,
        (SELECT COUNT(*) FROM Like_Posts lp WHERE lp.post=p.id) AS likes,
        (SELECT COUNT(*) FROM Comments c WHERE c.post=p.id) AS comments,
        (SELECT COUNT(*) FROM Reposts r WHERE r.post_id=p.id) AS reposts,
        EXISTS(SELECT 1 FROM Polls pl WHERE pl.post_id=p.id) AS hasPoll,
        CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
          SELECT 1 FROM Like_Posts x WHERE x.post=p.id AND x.user=?
        ) END AS likedByMe,
        CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
          SELECT 1 FROM Reposts y WHERE y.post_id=p.id AND y.user_id=?
        ) END AS repostedByMe,
        ${communityIdSelect} AS community_id,
        ${communitySlugSelect} AS community_slug,
        ${communityNameSelect} AS community_name,
        ${sensitiveSelect} AS is_sensitive
      FROM Posts p
      JOIN Users u ON u.id = p.user
      ${communityJoin}
      WHERE p.id IN (${placeholders})
      ORDER BY FIELD(p.id, ${placeholders})
      `,
      [meId, meId, meId, meId, ...ids, ...ids],
    );

    const items = rows.map((row) => ({
      ...row,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
      reposts: Number(row.reposts) || 0,
      views: (Number(row.likes) || 0) * 12 + (Number(row.comments) || 0) * 8 + (Number(row.reposts) || 0) * 15,
      likedByMe: Boolean(row.likedByMe),
      repostedByMe: Boolean(row.repostedByMe),
      hasPoll: Boolean(row.hasPoll),
      reply_scope: Number(row.reply_scope ?? 0),
      is_sensitive: Boolean(row.is_sensitive),
      isOwner: meId ? Number(row.user) === meId : false,
      isAdminViewer: Boolean(me?.is_admin),
      community:
        row.community_id && row.community_slug
          ? {
              id: Number(row.community_id),
              slug: String(row.community_slug),
              name: row.community_name ? String(row.community_name) : String(row.community_slug),
            }
          : null,
    }));

    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load saved posts", error);
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
