import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureProfilePrivacySchema } from "@/lib/profilePrivacy";

type FollowRequestItem = RowDataPacket & {
  id: number;
  requester_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
};

export async function GET() {
  const me = await requireUser();
  await ensureProfilePrivacySchema();

  const [rows] = await db.query<FollowRequestItem[]>(
    `SELECT fr.id, fr.requester_id, fr.created_at, u.username, u.nickname, u.avatar_url
     FROM Follow_Requests fr
     JOIN Users u ON u.id = fr.requester_id
     WHERE fr.target_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC
     LIMIT 80`,
    [me.id],
  );

  return NextResponse.json({ items: rows.map((row) => ({
    id: Number(row.id),
    requesterId: Number(row.requester_id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    created_at: row.created_at,
  })) });
}

export async function POST(req: Request) {
  const me = await requireUser();
  await ensureProfilePrivacySchema();

  const payload = (await req.json().catch(() => ({}))) as { requestId?: number; action?: "approve" | "reject" };
  const requestId = Number(payload.requestId);
  const action = payload.action;

  if (!Number.isFinite(requestId) || requestId <= 0 || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [rows] = await db.query<Array<RowDataPacket & { requester_id: number; target_id: number }>>(
    "SELECT requester_id, target_id FROM Follow_Requests WHERE id=? AND status='pending' LIMIT 1",
    [requestId],
  );
  const request = rows[0];
  if (!request || Number(request.target_id) !== me.id) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (action === "approve") {
    await db.execute("INSERT IGNORE INTO Follows (follower, followed, visible, created_at) VALUES (?, ?, 1, NOW())", [
      Number(request.requester_id),
      me.id,
    ]);
  }

  await db.execute<ResultSetHeader>("UPDATE Follow_Requests SET status=? WHERE id=?", [
    action === "approve" ? "approved" : "rejected",
    requestId,
  ]);

  return NextResponse.json({ ok: true });
}
