import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { deleteDemoConversation, resolveDemoUserByUsername } from "@/lib/demoStore";
import { ensureMessageTables, hideConversation, markConversationUnread, updateConversationSettings } from "@/lib/messages";

type UserRow = RowDataPacket & { id: number };

async function resolveOtherUserId(currentUserId: number, normalizedUsername: string): Promise<number> {
  if (!isDatabaseConfigured()) {
    const target = resolveDemoUserByUsername(normalizedUsername);
    if (!target || target.id === currentUserId) {
      return 0;
    }
    return target.id;
  }

  await ensureMessageTables();
  const [rows] = await db.query<UserRow[]>("SELECT id FROM Users WHERE LOWER(username)=? LIMIT 1", [normalizedUsername]);
  const otherUserId = Number(rows[0]?.id || 0);
  return otherUserId === currentUserId ? 0 : otherUserId;
}

export async function DELETE(_req: Request, context: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  const otherUserId = await resolveOtherUserId(me.id, normalized);
  if (!otherUserId) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    deleteDemoConversation(me.id, otherUserId);
    return NextResponse.json({ ok: true });
  }

  await hideConversation(me.id, otherUserId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, context: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();
  const payload = (await req.json().catch(() => ({}))) as { action?: string; enabled?: boolean };
  const action = typeof payload.action === "string" ? payload.action : "";

  if (!normalized || !action) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const otherUserId = await resolveOtherUserId(me.id, normalized);
  if (!otherUserId) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const enabled = payload.enabled !== false;
  if (action === "markUnread") {
    await markConversationUnread(me.id, otherUserId);
    return NextResponse.json({ ok: true });
  }

  const changesByAction = {
    archive: { isArchived: enabled },
    mute: { isMuted: enabled },
    pin: { isPinned: enabled },
    favorite: { isFavorite: enabled },
    list: { isListed: enabled },
    block: { isBlocked: enabled },
  } as const;

  const changes = changesByAction[action as keyof typeof changesByAction];
  if (!changes) {
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }

  await updateConversationSettings(me.id, otherUserId, changes);
  return NextResponse.json({ ok: true });
}
