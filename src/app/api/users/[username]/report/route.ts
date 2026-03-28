export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureUserReportsSchema } from "@/lib/userReports";

type Params = {
  params: Promise<{ username: string }>;
};

type TargetUserRow = RowDataPacket & {
  id: number;
};

export async function POST(req: Request, { params }: Params) {
  const me = await requireUser();
  const { username } = await params;
  const normalized = String(username || "").trim();

  if (!normalized) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  await ensureUserReportsSchema();

  const [targetRows] = await db.query<TargetUserRow[]>(
    "SELECT id FROM Users WHERE username=? AND visible=1 LIMIT 1",
    [normalized],
  );
  const target = targetRows[0];
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (Number(target.id) === me.id) {
    return NextResponse.json({ error: "No puedes reportar tu propia cuenta" }, { status: 400 });
  }

  const payload = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 280) : "";

  await db.execute(
    `INSERT INTO User_Reports (reported_user_id, reporter_id, reason, status, created_at)
     VALUES (?, ?, ?, 'pending', NOW())
     ON DUPLICATE KEY UPDATE reason=VALUES(reason), status='pending', created_at=NOW()`,
    [target.id, me.id, reason || null],
  );

  return NextResponse.json({ ok: true });
}
