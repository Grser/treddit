import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { getSessionUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCommunityAccessControl } from "@/lib/communityPermissions";

type Params = {
  params: Promise<{ id: string }>;
};

type AccessRow = RowDataPacket & {
  id: number;
  visible: number;
  isMember: number;
};

type ChatRow = RowDataPacket & {
  id: number;
  message: string;
  created_at: Date | string;
  user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

let communityMessagesTableReady: Promise<void> | null = null;

function ensureCommunityMessagesTable() {
  if (!communityMessagesTableReady) {
    communityMessagesTableReady = db.execute(
      `CREATE TABLE IF NOT EXISTS Community_Messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        community_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        message VARCHAR(500) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_community_messages_community_created (community_id, created_at),
        KEY idx_community_messages_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ).then(() => undefined);
  }
  return communityMessagesTableReady;
}

async function getCommunityAccess(communityId: number, userId: number | null) {
  const [rows] = await db.query<AccessRow[]>(
    `SELECT
      c.id,
      c.visible,
      CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
        SELECT 1 FROM Community_Members cm WHERE cm.community_id = c.id AND cm.user_id = ?
      ) END AS isMember
     FROM Communities c
     WHERE c.id = ?
     LIMIT 1`,
    [userId, userId, communityId]
  );
  return rows[0] ?? null;
}

export async function GET(_: Request, { params }: Params) {
  await ensureCommunityMessagesTable();

  const { id } = await params;
  const communityId = Number(id);
  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const me = await getSessionUser();
  const access = await getCommunityAccess(communityId, me?.id ?? null);
  if (!access) {
    return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
  }

  const canRead = Boolean(access.visible) || Boolean(access.isMember) || Boolean(me?.is_admin);
  if (!canRead) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [rows] = await db.query<ChatRow[]>(
    `SELECT cm.id, cm.message, cm.created_at, u.id AS user_id, u.username, u.nickname, u.avatar_url
     FROM Community_Messages cm
     JOIN Users u ON u.id = cm.user_id
     WHERE cm.community_id = ?
     ORDER BY cm.created_at DESC, cm.id DESC
     LIMIT 100`,
    [communityId]
  );

  return NextResponse.json({
    items: rows
      .reverse()
      .map((row) => ({
        id: Number(row.id),
        message: String(row.message),
        created_at: new Date(row.created_at).toISOString(),
        user: {
          id: Number(row.user_id),
          username: String(row.username),
          nickname: row.nickname ? String(row.nickname) : null,
          avatar_url: row.avatar_url ? String(row.avatar_url) : null,
        },
      })),
  });
}

export async function POST(req: Request, { params }: Params) {
  await ensureCommunityMessagesTable();

  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);
  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const access = await getCommunityAccess(communityId, me.id);
  if (!access) {
    return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
  }

  const acl = await getCommunityAccessControl(communityId, me.id);
  if (acl.isBanned) {
    return NextResponse.json({ error: "No puedes participar: estás baneado de esta comunidad" }, { status: 403 });
  }

  const canWrite = (Boolean(access.isMember) && acl.permissions.can_chat && !acl.isMuted) || Boolean(me.is_admin);
  if (!canWrite) {
    if (acl.isMuted) {
      return NextResponse.json({ error: "No puedes escribir: estás silenciado en esta comunidad" }, { status: 403 });
    }
    return NextResponse.json({ error: "Debes unirte a la comunidad para chatear" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";

  if (!message) {
    return NextResponse.json({ error: "Escribe un mensaje" }, { status: 400 });
  }

  await db.execute(
    "INSERT INTO Community_Messages (community_id, user_id, message) VALUES (?, ?, ?)",
    [communityId, me.id, message]
  );

  return NextResponse.json({ ok: true });
}
