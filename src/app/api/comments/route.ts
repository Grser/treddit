export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";

/**
 * GET /api/comments?postId=123
 * Devuelve árbol (máx 200 comentarios por post para no reventar).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = Number(url.searchParams.get("postId") || 0);
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 500);
  if (!postId) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });

  // Trae todos los comentarios visibles del post
  const [rows] = await db.query(
    `
    SELECT
      c.id,
      c.user             AS userId,
      u.username,
      u.nickname,
      u.avatar_url,
      c.text,
      c.created_at,
      c.comment          AS parentId
    FROM Comments c
    JOIN Users u ON u.id = c.user
    WHERE c.post = ? AND c.visible = 1
    ORDER BY c.created_at DESC
    LIMIT ?
    `,
    [postId, limit]
  );

  // Construye árbol simple en memoria
  const byId = new Map<number, any>();
  const roots: any[] = [];
  (rows as any[]).forEach((r) => {
    byId.set(r.id, { ...r, replies: [] as any[] });
  });
  (rows as any[]).forEach((r) => {
    const node = byId.get(r.id);
    if (r.parentId && byId.get(r.parentId)) {
      byId.get(r.parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  });

  // Opcional: ordena hijos cronológicamente ascendente
  function sortTree(nodes: any[]) {
    nodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    nodes.forEach((n) => sortTree(n.replies));
  }
  sortTree(roots);

  return NextResponse.json(roots, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/comments
 * body: { postId: number, text: string, parentId?: number }
 */
export async function POST(req: Request) {
  const me = await requireUser();
  const { postId, text, parentId } = await req.json().catch(() => ({}));
  if (!postId || !text?.trim()) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Verifica que el parent pertenezca al mismo post (si viene)
  if (parentId) {
    const [chk] = await db.query("SELECT post FROM Comments WHERE id=? LIMIT 1", [parentId]);
    const parent = (chk as any[])[0];
    if (!parent || Number(parent.post) !== Number(postId)) {
      return NextResponse.json({ error: "Parent inválido" }, { status: 400 });
    }
  }

  const [ins] = await db.execute(
    "INSERT INTO Comments (post, user, comment, text, created_at, visible) VALUES (?, ?, ?, ?, NOW(), 1)",
    [postId, me.id, parentId ?? null, String(text)]
  );
  const id = (ins as any).insertId as number;

  // Devuelve el comment recién creado (plano)
  const [row] = await db.query(
    `
    SELECT c.id, c.user AS userId, u.username, u.nickname, u.avatar_url, c.text, c.created_at, c.comment AS parentId
    FROM Comments c JOIN Users u ON u.id=c.user WHERE c.id=? LIMIT 1
    `,
    [id]
  );

  return NextResponse.json(row[0] || { id }, { status: 201 });
}
