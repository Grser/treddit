import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { followSchema } from "@/lib/validators";
import { ensureProfilePrivacySchema } from "@/lib/profilePrivacy";

type UserPrivacyRow = { id: number; is_private: number };

export async function POST(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  await ensureProfilePrivacySchema();

  const targetId = parsed.data.userId;
  if (targetId === me.id) return NextResponse.json({ error: "No puedes seguirte a ti mismo" }, { status: 400 });

  const [targetRows] = await db.query<UserPrivacyRow[]>("SELECT id, is_private FROM Users WHERE id=? AND visible=1 LIMIT 1", [targetId]);
  const target = targetRows[0];
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (Boolean(target.is_private)) {
    await db.execute(
      `INSERT INTO Follow_Requests (requester_id, target_id, status, created_at)
       VALUES (?, ?, 'pending', NOW())
       ON DUPLICATE KEY UPDATE status='pending', updated_at=CURRENT_TIMESTAMP`,
      [me.id, targetId],
    );
    await db.execute("DELETE FROM Follows WHERE follower=? AND followed=?", [me.id, targetId]).catch(() => {});
    return NextResponse.json({ ok: true, pending: true });
  }

  await db.execute("DELETE FROM Follow_Requests WHERE requester_id=? AND target_id=?", [me.id, targetId]);
  await db.execute("INSERT IGNORE INTO Follows (follower, followed, visible, created_at) VALUES (?, ?, 1, NOW())", [me.id, targetId]);
  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  await ensureProfilePrivacySchema();

  await db.execute("DELETE FROM Follows WHERE follower=? AND followed=?", [me.id, parsed.data.userId]);
  await db.execute("DELETE FROM Follow_Requests WHERE requester_id=? AND target_id=?", [me.id, parsed.data.userId]);
  return NextResponse.json({ ok: true });
}
