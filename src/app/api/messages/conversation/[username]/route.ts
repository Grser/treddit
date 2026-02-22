import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { deleteDemoConversation, resolveDemoUserByUsername } from "@/lib/demoStore";
import { ensureMessageTables, hideConversation } from "@/lib/messages";

type UserRow = RowDataPacket & { id: number };

export async function DELETE(_req: Request, context: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    const target = resolveDemoUserByUsername(normalized);
    if (!target || target.id === me.id) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 404 });
    }
    deleteDemoConversation(me.id, target.id);
    return NextResponse.json({ ok: true });
  }

  await ensureMessageTables();
  const [rows] = await db.query<UserRow[]>("SELECT id FROM Users WHERE LOWER(username)=? LIMIT 1", [normalized]);
  const otherUserId = Number(rows[0]?.id || 0);
  if (!otherUserId || otherUserId === me.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 404 });
  }

  await hideConversation(me.id, otherUserId);
  return NextResponse.json({ ok: true });
}
