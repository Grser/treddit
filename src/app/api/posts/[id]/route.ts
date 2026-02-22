export const runtime = "nodejs";
import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { isUserAgeVerified } from "@/lib/ageVerification";
import { getDemoFeed } from "@/lib/demoStore";
import { estimatePostViews } from "@/lib/postStats";
import { getPostsSensitiveColumn } from "@/lib/postSensitivity";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

type PostOwnerRow = RowDataPacket & { user: number };
type UserAdminRow = RowDataPacket & { is_admin: number };
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
  is_sensitive: number | boolean | null;
};

type PostPatchBody = {
  op?: unknown;
  value?: unknown;
  description?: unknown;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  const { id: postId } = await params;
  const id = Number(postId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    const { items } = getDemoFeed({ limit: 200 });
    const item = items.find((post) => Number(post.id) === id) ?? null;
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  const sensitiveColumn = await getPostsSensitiveColumn();
  const sensitiveSelect = sensitiveColumn ? `p.${sensitiveColumn}` : "0";

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
      (SELECT COUNT(*) FROM Reposts rp2 WHERE rp2.post_id = p.id AND rp2.user_id = ?) AS repostedByMe,
      ${sensitiveSelect} AS is_sensitive
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE p.id = ?
    LIMIT 1
    `,
    [me?.id ?? 0, me?.id ?? 0, id],
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSensitive = Boolean(row.is_sensitive);
  const canViewSensitive = me?.id && isSensitive ? await isUserAgeVerified(me.id) : false;

  return NextResponse.json({
    item: {
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
      views: estimatePostViews({ likes: row.likes, comments: row.comments, reposts: row.reposts }),
      hasPoll: Number(row.hasPoll) > 0,
      likedByMe: Number(row.likedByMe) > 0,
      repostedByMe: Number(row.repostedByMe) > 0,
      is_sensitive: isSensitive,
      can_view_sensitive: canViewSensitive,
    },
  });
}

async function deletePost(me: AuthenticatedUser, id: number) {
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [rows] = await db.query<PostOwnerRow[]>("SELECT user FROM Posts WHERE id=? LIMIT 1", [id]);
  const ownerRow = rows[0];
  if (!ownerRow?.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = Number(ownerRow.user) === me.id;
  let isAdmin = false;
  if (!isOwner) {
    const [adminRows] = await db.query<UserAdminRow[]>("SELECT is_admin FROM Users WHERE id=?", [me.id]);
    isAdmin = Boolean(adminRows[0]?.is_admin);
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.execute("DELETE FROM Posts WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id: postId } = await params;
  const id = Number(postId);
  return deletePost(me, id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const methodOverride = req.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ||
    req.headers.get("content-type")?.includes("multipart/form-data");
  if (!methodOverride) {
    return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  const form = await req.formData();
  const op = String(form.get("_method") || "").toUpperCase();
  if (op !== "DELETE") {
    return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  const me = await requireUser();
  const { id: postId } = await params;
  const id = Number(postId);
  return deletePost(me, id);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id: postId } = await params;
  const id = Number(postId);
  const rawBody = (await req.json().catch(() => null)) as PostPatchBody | null;
  const patchBody = {
    op: typeof rawBody?.op === "string" ? rawBody.op : undefined,
    value: rawBody?.value,
    description: typeof rawBody?.description === "string" ? rawBody.description : undefined,
  };

  const [postRows] = await db.query<PostOwnerRow[]>("SELECT user FROM Posts WHERE id=? LIMIT 1", [id]);
  const postRow = postRows[0];
  if (!postRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [adminRows] = await db.query<UserAdminRow[]>("SELECT is_admin FROM Users WHERE id=?", [me.id]);
  const isOwner = Number(postRow.user) === me.id;
  const isAdmin = Boolean(adminRows[0]?.is_admin);
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  switch (patchBody.op) {
    case "pin":
      await db.execute("UPDATE Users SET pinned_post_id=? WHERE id=?", [id, me.id]);
      break;
    case "unpin":
      await db.execute("UPDATE Users SET pinned_post_id=NULL WHERE id=?", [me.id]);
      break;
    case "who_can_reply":
      await db.execute("UPDATE Posts SET reply_scope=? WHERE id=?", [Number(patchBody.value) || 0, id]);
      break;
    case "feature":
      // marca destacada (si quieres una tabla aparte)
      break;
    default:
      // editar descripción
      if (patchBody.description !== undefined) {
        await db.execute("UPDATE Posts SET description=? WHERE id=?", [patchBody.description.slice(0, 2000), id]);
      }
  }

  return NextResponse.json({ ok: true });
}
