export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoPosts } from "@/data/demoPosts";

type ReplyRow = {
  id: number;
  text: string;
  created_at: string | Date;
  postId: number;
  postDescription: string | null;
  postUsername: string;
  postNickname: string | null;
  postAvatar: string | null;
  postIsAdmin: number | boolean;
  postIsVerified: number | boolean;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || 0);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);

  if (!userId) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!isDatabaseConfigured()) {
    const posts = getDemoPosts(limit * 2);
    const sample = posts.slice(0, Math.min(posts.length, 5)).map((post, index) => ({
      id: index + 1,
      text: `Thanks for sharing, @${post.username}!`,
      created_at: new Date(Date.now() - index * 60_000).toISOString(),
      post: {
        id: post.id,
        description: post.description,
        username: post.username,
        nickname: post.nickname,
        avatar_url: post.avatar_url,
        is_admin: post.is_admin,
        is_verified: post.is_verified,
      },
    }));

    return NextResponse.json(
      { items: sample },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const [rows] = await db.query<ReplyRow[]>(
    `
    SELECT
      c.id,
      c.text,
      c.created_at,
      p.id            AS postId,
      p.description   AS postDescription,
      u.username      AS postUsername,
      u.nickname      AS postNickname,
      u.avatar_url    AS postAvatar,
      u.is_admin      AS postIsAdmin,
      u.is_verified   AS postIsVerified
    FROM Comments c
    JOIN Posts p ON p.id = c.post
    JOIN Users u ON u.id = p.user
    WHERE c.user = ? AND c.visible = 1
    ORDER BY c.created_at DESC
    LIMIT ?
    `,
    [userId, limit]
  );

  const items = (rows as ReplyRow[]).map((row) => ({
    id: row.id,
    text: row.text,
    created_at: new Date(row.created_at).toISOString(),
    post: {
      id: row.postId,
      description: row.postDescription,
      username: row.postUsername,
      nickname: row.postNickname,
      avatar_url: row.postAvatar,
      is_admin: Boolean(row.postIsAdmin),
      is_verified: Boolean(row.postIsVerified),
    },
  }));

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
