import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";

import Navbar from "@/components/Navbar";
import PostCard, { type Post as PostCardType } from "@/components/PostCard";
import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoFeed } from "@/lib/demoStore";

type PostDetailsRow = RowDataPacket & {
  id: number;
  user: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number | boolean;
  is_verified: number | boolean;
  description: string | null;
  created_at: string | Date;
  mediaUrl: string | null;
  likes: number;
  comments: number;
  reposts: number;
  hasPoll: number;
  likedByMe: number;
  repostedByMe: number;
};

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSessionUser()]);

  const postId = Number(id);
  if (!Number.isFinite(postId) || postId <= 0) {
    notFound();
  }

  let post: PostCardType | null = null;

  if (!isDatabaseConfigured()) {
    const { items } = getDemoFeed({ limit: 200 });
    post = items.find((item) => Number(item.id) === postId) ?? null;
  } else {
    const [rows] = await db.query<PostDetailsRow[]>(
      `
      SELECT
        p.id,
        p.user,
        u.username,
        u.nickname,
        u.avatar_url,
        u.is_admin,
        u.is_verified,
        p.description,
        p.created_at,
        (SELECT route FROM Files f WHERE f.postid = p.id ORDER BY f.id DESC LIMIT 1) AS mediaUrl,
        (SELECT COUNT(*) FROM Like_Posts lp WHERE lp.post = p.id) AS likes,
        (SELECT COUNT(*) FROM Comments c WHERE c.post = p.id AND c.visible = 1) AS comments,
        (SELECT COUNT(*) FROM Reposts rp WHERE rp.post_id = p.id) AS reposts,
        (SELECT COUNT(*) FROM Polls po WHERE po.post_id = p.id) AS hasPoll,
        (SELECT COUNT(*) FROM Like_Posts lp2 WHERE lp2.post = p.id AND lp2.user = ?) AS likedByMe,
        (SELECT COUNT(*) FROM Reposts rp2 WHERE rp2.post_id = p.id AND rp2.user_id = ?) AS repostedByMe
      FROM Posts p
      JOIN Users u ON u.id = p.user
      WHERE p.id = ?
      LIMIT 1
      `,
      [session?.id ?? 0, session?.id ?? 0, postId],
    );

    const row = rows[0];
    if (row) {
      post = {
        id: Number(row.id),
        user: Number(row.user),
        username: String(row.username),
        nickname: row.nickname ? String(row.nickname) : String(row.username),
        avatar_url: row.avatar_url ? String(row.avatar_url) : null,
        is_admin: Boolean(row.is_admin),
        is_verified: Boolean(row.is_verified),
        description: row.description ? String(row.description) : null,
        created_at: new Date(row.created_at).toISOString(),
        mediaUrl: row.mediaUrl ? String(row.mediaUrl) : null,
        likes: Number(row.likes) || 0,
        comments: Number(row.comments) || 0,
        reposts: Number(row.reposts) || 0,
        hasPoll: Number(row.hasPoll) > 0,
        likedByMe: Number(row.likedByMe) > 0,
        repostedByMe: Number(row.repostedByMe) > 0,
      };
    }
  }

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={session} />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <PostCard post={post} canInteract={Boolean(session)} />
      </main>
    </div>
  );
}
