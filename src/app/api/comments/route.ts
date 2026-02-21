export const runtime = "nodejs";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db, isDatabaseConnectionLimitError } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type CommentRow = RowDataPacket & {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
  text: string;
  created_at: Date | string;
  parentId: number | null;
};

type CommentNode = {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_verified: boolean;
  text: string;
  created_at: string;
  parentId: number | null;
  replies: CommentNode[];
};

type CommentResponse = Omit<CommentNode, "replies">;

type CommentRequestBody = {
  postId?: unknown;
  text?: unknown;
  parentId?: unknown;
};

type ParentRow = RowDataPacket & { post: number };

/**
 * GET /api/comments?postId=123
 * Devuelve árbol (máx 200 comentarios por post para no reventar).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = Number(url.searchParams.get("postId") || 0);
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 500);
    if (!postId) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });

    // Trae todos los comentarios visibles del post
    const [rows] = await db.query<CommentRow[]>(
      `
    SELECT
      c.id,
      c.user             AS userId,
      u.username,
      u.nickname,
      u.avatar_url,
      u.is_admin,
      u.is_verified,
      c.text,
      c.created_at,
      c.comment          AS parentId
    FROM Comments c
    JOIN Users u ON u.id = c.user
    WHERE c.post = ? AND c.visible = 1
    ORDER BY c.created_at ASC
    LIMIT ?
    `,
      [postId, limit],
    );

    // Construye árbol simple en memoria
    const byId = new Map<number, CommentNode>();
    const roots: CommentNode[] = [];
    rows.forEach((row) => {
      const node = mapRowToNode(row);
      byId.set(node.id, node);
    });
    rows.forEach((row) => {
      const node = byId.get(Number(row.id));
      if (!node) return;
      const parentId = node.parentId;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    return NextResponse.json(roots, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isDatabaseConnectionLimitError(error)) {
      return NextResponse.json(
        { error: "Servicio temporalmente no disponible" },
        {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "5" },
        },
      );
    }
    throw error;
  }
}

/**
 * POST /api/comments
 * body: { postId: number, text: string, parentId?: number }
 */
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const rawBody = (await req.json().catch(() => null)) as CommentRequestBody | null;
    const postId = Number(rawBody?.postId ?? 0);
    const text = typeof rawBody?.text === "string" ? rawBody.text : "";
    const parentIdRaw = rawBody?.parentId;
    const parsedParent =
      typeof parentIdRaw === "number" || typeof parentIdRaw === "string"
        ? Number(parentIdRaw)
        : null;
    const parentId =
      typeof parsedParent === "number" && Number.isFinite(parsedParent) && parsedParent > 0
        ? parsedParent
        : null;

    if (!postId || !text.trim()) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Verifica que el parent pertenezca al mismo post (si viene)
    if (parentId) {
      const [chk] = await db.query<ParentRow[]>("SELECT post FROM Comments WHERE id=? LIMIT 1", [parentId]);
      const parent = chk[0];
      if (!parent || Number(parent.post) !== Number(postId)) {
        return NextResponse.json({ error: "Parent inválido" }, { status: 400 });
      }
    }

    const [ins] = await db.execute<ResultSetHeader>(
      "INSERT INTO Comments (post, user, comment, text, created_at, visible) VALUES (?, ?, ?, ?, NOW(), 1)",
      [postId, me.id, parentId ?? null, String(text)],
    );
    const id = Number(ins.insertId);

    // Devuelve el comment recién creado (plano)
    const [row] = await db.query<CommentRow[]>(
      `
    SELECT c.id, c.user AS userId, u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified,
           c.text, c.created_at, c.comment AS parentId
    FROM Comments c JOIN Users u ON u.id=c.user WHERE c.id=? LIMIT 1
    `,
      [id],
    );

    if (!row[0]) {
      return NextResponse.json({ id }, { status: 201 });
    }

    return NextResponse.json(mapRowToResponse(row[0]), { status: 201 });
  } catch (error) {
    if (isDatabaseConnectionLimitError(error)) {
      return NextResponse.json(
        { error: "Servicio temporalmente no disponible" },
        {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "5" },
        },
      );
    }
    throw error;
  }
}

function mapRowToNode(row: CommentRow): CommentNode {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    is_admin: Boolean(row.is_admin),
    is_verified: Boolean(row.is_verified),
    text: String(row.text),
    created_at: new Date(row.created_at).toISOString(),
    parentId: row.parentId !== null ? Number(row.parentId) : null,
    replies: [],
  };
}

function mapRowToResponse(row: CommentRow): CommentResponse {
  const node = mapRowToNode(row);
  return {
    id: node.id,
    userId: node.userId,
    username: node.username,
    nickname: node.nickname,
    avatar_url: node.avatar_url,
    is_admin: node.is_admin,
    is_verified: node.is_verified,
    text: node.text,
    created_at: node.created_at,
    parentId: node.parentId,
  };
}
