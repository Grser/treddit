export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensurePostReportsSchema } from "@/lib/postReports";

type Params = {
  params: Promise<{ id: string }>;
};

type PostOwnerRow = RowDataPacket & {
  user: number;
};

export async function POST(req: Request, { params }: Params) {
  const me = await requireUser();
  const resolved = await params;
  const postId = Number(resolved.id);

  if (!Number.isFinite(postId) || postId <= 0) {
    return NextResponse.json({ error: "Post inválido" }, { status: 400 });
  }

  await ensurePostReportsSchema();

  const [postRows] = await db.query<PostOwnerRow[]>("SELECT user FROM Posts WHERE id=? LIMIT 1", [postId]);
  const post = postRows[0];
  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }
  if (Number(post.user) === me.id) {
    return NextResponse.json({ error: "No puedes reportar tu propio post" }, { status: 400 });
  }

  const payload = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 280) : "";

  await db.execute(
    `INSERT INTO Post_Reports (post_id, reporter_id, reason, status, created_at)
     VALUES (?, ?, ?, 'pending', NOW())
     ON DUPLICATE KEY UPDATE reason=VALUES(reason), status='pending', created_at=NOW()`,
    [postId, me.id, reason || null],
  );

  return NextResponse.json({ ok: true });
}
