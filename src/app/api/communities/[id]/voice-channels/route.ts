import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCommunityAclTables, getCommunityAccessControl } from "@/lib/communityPermissions";

type Params = { params: Promise<{ id: string }> };

type VoiceChannelRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  created_by: number;
};

type ListenerRow = RowDataPacket & {
  channel_id: number;
  user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

let tablesReady: Promise<void> | null = null;

async function ensureVoiceTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Voice_Channels (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          slug VARCHAR(90) NOT NULL,
          name VARCHAR(90) NOT NULL,
          created_by BIGINT UNSIGNED NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_community_voice_slug (community_id, slug),
          KEY idx_community_voice_channels_community (community_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Voice_Channel_Presence (
          community_id BIGINT UNSIGNED NOT NULL,
          channel_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (community_id, channel_id, user_id),
          KEY idx_community_voice_presence_user (community_id, user_id),
          KEY idx_community_voice_presence_channel (community_id, channel_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    })();
  }

  await tablesReady;
}

function createSlug(rawName: string) {
  return rawName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

async function cleanupInactivePresence(communityId: number) {
  await db.execute(
    `DELETE FROM Community_Voice_Channel_Presence
     WHERE community_id = ?
       AND last_seen_at < DATE_SUB(NOW(), INTERVAL 70 SECOND)`,
    [communityId],
  );
}

async function buildPayload(communityId: number) {
  await cleanupInactivePresence(communityId);

  const [channelRows] = await db.query<VoiceChannelRow[]>(
    `SELECT id, slug, name, created_by
     FROM Community_Voice_Channels
     WHERE community_id = ?
     ORDER BY created_at ASC`,
    [communityId],
  );

  if (!channelRows.length) {
    return { channels: [] };
  }

  const [listenerRows] = await db.query<ListenerRow[]>(
    `SELECT p.channel_id, u.id AS user_id, u.username, u.nickname, u.avatar_url
     FROM Community_Voice_Channel_Presence p
     JOIN Users u ON u.id = p.user_id
     WHERE p.community_id = ?
     ORDER BY p.last_seen_at DESC
     LIMIT 500`,
    [communityId],
  );

  const listenersByChannel = new Map<number, ListenerRow[]>();
  for (const row of listenerRows) {
    const channelId = Number(row.channel_id);
    const list = listenersByChannel.get(channelId) || [];
    list.push(row);
    listenersByChannel.set(channelId, list);
  }

  return {
    channels: channelRows.map((channel) => ({
      id: Number(channel.id),
      slug: String(channel.slug),
      name: String(channel.name),
      createdBy: Number(channel.created_by),
      listeners: (listenersByChannel.get(Number(channel.id)) || []).map((listener) => ({
        id: Number(listener.user_id),
        username: String(listener.username),
        nickname: listener.nickname ? String(listener.nickname) : null,
        avatarUrl: listener.avatar_url ? String(listener.avatar_url) : null,
      })),
    })),
  };
}

export async function GET(_: Request, { params }: Params) {
  await ensureCommunityAclTables();
  await ensureVoiceTables();

  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const access = await getCommunityAccessControl(communityId, me.id);
  if ((!access.isMember || access.isBanned) && !me.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(await buildPayload(communityId));
}

export async function POST(req: Request, { params }: Params) {
  await ensureCommunityAclTables();
  await ensureVoiceTables();

  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const access = await getCommunityAccessControl(communityId, me.id);
  if ((!access.isMember || access.isBanned) && !me.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action || "");

  if (action === "create") {
    if ((!access.permissions.can_manage_voice_channels || !access.isMember) && !me.is_admin) {
      return NextResponse.json({ error: "No tienes permiso para crear salas" }, { status: 403 });
    }

    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 90) : "";
    if (!name) {
      return NextResponse.json({ error: "Nombre de sala inválido" }, { status: 400 });
    }

    const baseSlug = createSlug(name) || "sala";
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    await db.execute(
      `INSERT INTO Community_Voice_Channels (community_id, slug, name, created_by)
       VALUES (?, ?, ?, ?)`,
      [communityId, slug, name, me.id],
    );

    return NextResponse.json({ ok: true, ...(await buildPayload(communityId)) });
  }

  if (action === "join" || action === "heartbeat") {
    const channelId = Number(body?.channelId);
    if (!Number.isInteger(channelId) || channelId <= 0) {
      return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
    }

    const [channelRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM Community_Voice_Channels WHERE id = ? AND community_id = ? LIMIT 1",
      [channelId, communityId],
    );
    if (!channelRows.length) {
      return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });
    }

    if (action === "join") {
      await db.execute("DELETE FROM Community_Voice_Channel_Presence WHERE community_id = ? AND user_id = ?", [communityId, me.id]);
    }

    await db.execute(
      `INSERT INTO Community_Voice_Channel_Presence (community_id, channel_id, user_id, last_seen_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE last_seen_at = NOW()`,
      [communityId, channelId, me.id],
    );

    return NextResponse.json({ ok: true, ...(await buildPayload(communityId)) });
  }

  if (action === "leave") {
    await db.execute(
      "DELETE FROM Community_Voice_Channel_Presence WHERE community_id = ? AND user_id = ?",
      [communityId, me.id],
    );
    return NextResponse.json({ ok: true, ...(await buildPayload(communityId)) });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
