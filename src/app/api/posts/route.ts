export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { getDemoPosts } from "@/data/demoPosts";

type PostRow = {
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
};

export async function GET(req: Request) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 50);
  const cursor = url.searchParams.get("cursor");
  const userId = Number(url.searchParams.get("userId") || 0);
  const likesOf = Number(url.searchParams.get("likesOf") || 0);
  const params: number[] = [];
  const joins: string[] = [];
  const whereParts: string[] = [];

  if (likesOf > 0) {
    joins.push("JOIN Like_Posts lpFilter ON lpFilter.post = p.id AND lpFilter.user = ?");
    params.push(likesOf);
  }

  const cursorValue = Number(cursor);
  if (cursor && !Number.isNaN(cursorValue)) {
    whereParts.push("p.id < ?");
    params.push(cursorValue);
  }

  if (userId > 0) {
    whereParts.push("p.user = ?");
    params.push(userId);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const meId = me?.id ?? null;

  const fallback = () => {
    let items = getDemoPosts(limit);
    if (userId > 0) {
      items = items.filter((item) => item.user === userId);
    }
    if (likesOf > 0) {
      // sin base de datos no hay likes reales, devolvemos vacío
      items = [];
    }
    const normalized = items.slice(0, limit).map((item) => ({
      ...item,
      isOwner: meId ? item.user === meId : false,
      isAdminViewer: Boolean(me?.is_admin),
    }));
    return NextResponse.json(
      { items: normalized, nextCursor: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  };

  if (!isDatabaseConfigured()) {
    return fallback();
  }

  try {
    const [rows] = await db.query<PostRow[]>(
      `
      SELECT
        p.id,
        p.user                                       AS user,
        u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified,
        p.description, p.created_at, p.reply_scope,
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
      ${joins.join(" ")}
      JOIN Users u ON u.id = p.user
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ?
      `,
      [meId, meId, meId, meId, ...params, limit + 1]
    );

    const list = rows;
    const items = list.slice(0, limit).map((row) => ({
      ...row,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
      reposts: Number(row.reposts) || 0,
      likedByMe: Boolean(row.likedByMe),
      repostedByMe: Boolean(row.repostedByMe),
      hasPoll: Boolean(row.hasPoll),
      reply_scope: Number(row.reply_scope ?? 0),
      isOwner: meId ? Number(row.user) === meId : false,
      isAdminViewer: Boolean(me?.is_admin),
    }));
    const nextCursor = list.length > limit ? String(items[items.length - 1].id) : null;

    return new NextResponse(JSON.stringify({ items, nextCursor }), {
      headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to load posts from database", error);
    return fallback();
  }
}

export async function POST(req: Request) {
  const me = await requireUser();

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const descriptionValue = body["description"];
  let description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const mediaUrlValue = body["mediaUrl"];
  const mediaUrl = typeof mediaUrlValue === "string" ? mediaUrlValue.trim() : "";
  const pollPayload = body["poll"];

  description = description.slice(0, 2000);

  type NormalizedPoll = { question: string; options: string[]; days: number } | null;
  let poll: NormalizedPoll = null;

  if (pollPayload && typeof pollPayload === "object" && !Array.isArray(pollPayload)) {
    const pollObject = pollPayload as Record<string, unknown>;
    const questionValue = pollObject["question"];
    const question = typeof questionValue === "string" ? questionValue.trim() : "";
    const optionsRaw = pollObject["options"];
    const options = Array.isArray(optionsRaw)
      ? optionsRaw.map((opt) => (typeof opt === "string" ? opt.trim() : "")).filter(Boolean)
      : [];
    const daysRaw = Number(pollObject["days"]);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 7) : 1;

    if (!question || options.length < 2) {
      return NextResponse.json({ error: "Encuesta inválida" }, { status: 400 });
    }

    poll = { question: question.slice(0, 200), options: options.slice(0, 4), days };
  } else if (pollPayload !== undefined && pollPayload !== null) {
    return NextResponse.json({ error: "Encuesta inválida" }, { status: 400 });
  }

  if (!description && !mediaUrl && !poll) {
    return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
  }

  let postId: number | null = null;
  let pollId: number | null = null;

  try {
    const [insertPost] = await db.execute<ResultSetHeader>(
      "INSERT INTO Posts (user, description, created_at, reply_scope) VALUES (?, ?, NOW(), 0)",
      [me.id, description || null]
    );
    postId = insertPost.insertId;

    if (mediaUrl) {
      try {
        await db.execute("INSERT INTO Files (postid, route) VALUES (?, ?)", [postId, mediaUrl]);
      } catch (error) {
        console.warn("No se pudo guardar archivo multimedia", error);
      }
    }

    if (poll) {
      const endsAt = new Date(Date.now() + poll.days * 24 * 60 * 60 * 1000);
      const [insertPoll] = await db.execute<ResultSetHeader>(
        "INSERT INTO Polls (post_id, question, ends_at) VALUES (?, ?, ?)",
        [postId, poll.question, endsAt]
      );
      pollId = insertPoll.insertId;
      await Promise.all(
        poll.options.map((option) =>
          db.execute("INSERT INTO Poll_Options (poll_id, text) VALUES (?, ?)", [pollId, option])
        )
      );
    }
  } catch (error) {
    console.error("Failed to create post", error);
    if (pollId) {
      await db.execute("DELETE FROM Polls WHERE id=?", [pollId]).catch(() => {});
      await db.execute("DELETE FROM Poll_Options WHERE poll_id=?", [pollId]).catch(() => {});
    }
    if (postId) {
      await db.execute("DELETE FROM Posts WHERE id=?", [postId]).catch(() => {});
      await db.execute("DELETE FROM Files WHERE postid=?", [postId]).catch(() => {});
    }
    return NextResponse.json({ error: "No se pudo crear la publicación" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: postId }, { status: 201 });
}
