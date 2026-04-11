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
type VoiceChannelRoleRow = RowDataPacket & {
  channel_id: number;
  role_id: number;
};
type CommunityRoleRow = RowDataPacket & {
  id: number;
  name: string;
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

      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Voice_Channel_Role_Access (
          community_id BIGINT UNSIGNED NOT NULL,
          channel_id BIGINT UNSIGNED NOT NULL,
          role_id BIGINT UNSIGNED NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (community_id, channel_id, role_id),
          KEY idx_voice_role_access_channel (community_id, channel_id),
          KEY idx_voice_role_access_role (community_id, role_id)
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

function sanitizeRoleIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const roleIds = input
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  return Array.from(new Set(roleIds)).slice(0, 20);
}

async function canUserJoinVoiceChannel(communityId: number, channelId: number, roleId: number | null, bypass: boolean) {
  if (bypass) return true;
  const [allowedRows] = await db.query<RowDataPacket[]>(
    `SELECT role_id
     FROM Community_Voice_Channel_Role_Access
     WHERE community_id = ? AND channel_id = ?
     LIMIT 30`,
    [communityId, channelId],
  );
  if (!allowedRows.length) return true;
  if (!roleId) return false;
  return allowedRows.some((row) => Number(row.role_id) === roleId);
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
  const [roleAccessRows] = await db.query<VoiceChannelRoleRow[]>(
    `SELECT channel_id, role_id
     FROM Community_Voice_Channel_Role_Access
     WHERE community_id = ?`,
    [communityId],
  );
  const [rolesRows] = await db.query<CommunityRoleRow[]>(
    `SELECT id, name
     FROM Community_Roles
     WHERE community_id = ?
     ORDER BY name ASC`,
    [communityId],
  );

  const listenersByChannel = new Map<number, ListenerRow[]>();
  for (const row of listenerRows) {
    const channelId = Number(row.channel_id);
    const list = listenersByChannel.get(channelId) || [];
    list.push(row);
    listenersByChannel.set(channelId, list);
  }
  const roleAccessByChannel = new Map<number, number[]>();
  for (const row of roleAccessRows) {
    const channelId = Number(row.channel_id);
    const list = roleAccessByChannel.get(channelId) || [];
    list.push(Number(row.role_id));
    roleAccessByChannel.set(channelId, list);
  }

  return {
    channels: channelRows.map((channel) => ({
      id: Number(channel.id),
      slug: String(channel.slug),
      name: String(channel.name),
      createdBy: Number(channel.created_by),
      allowedRoleIds: roleAccessByChannel.get(Number(channel.id)) || [],
      listeners: (listenersByChannel.get(Number(channel.id)) || []).map((listener) => ({
        id: Number(listener.user_id),
        username: String(listener.username),
        nickname: listener.nickname ? String(listener.nickname) : null,
        avatarUrl: listener.avatar_url ? String(listener.avatar_url) : null,
      })),
    })),
    roles: rolesRows.map((role) => ({
      id: Number(role.id),
      name: String(role.name),
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
    const allowedRoleIds = sanitizeRoleIds(body?.allowedRoleIds);
    if (!name) {
      return NextResponse.json({ error: "Nombre de sala inválido" }, { status: 400 });
    }

    const baseSlug = createSlug(name) || "sala";
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    const [result] = await db.execute(
      `INSERT INTO Community_Voice_Channels (community_id, slug, name, created_by)
       VALUES (?, ?, ?, ?)`,
      [communityId, slug, name, me.id],
    );
    const channelId = Number((result as { insertId?: number }).insertId || 0);

    if (allowedRoleIds.length && channelId > 0) {
      const values = allowedRoleIds.map((roleId) => [communityId, channelId, roleId]);
      await db.query(
        "INSERT IGNORE INTO Community_Voice_Channel_Role_Access (community_id, channel_id, role_id) VALUES ?",
        [values],
      );
    }

    return NextResponse.json({ ok: true, ...(await buildPayload(communityId)) });
  }

  if (action === "update") {
    if ((!access.permissions.can_manage_voice_channels || !access.isMember) && !me.is_admin) {
      return NextResponse.json({ error: "No tienes permiso para editar salas" }, { status: 403 });
    }
    const channelId = Number(body?.channelId);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 90) : "";
    const allowedRoleIds = sanitizeRoleIds(body?.allowedRoleIds);
    if (!Number.isInteger(channelId) || channelId <= 0 || !name) {
      return NextResponse.json({ error: "Datos de sala inválidos" }, { status: 400 });
    }

    await db.execute(
      `UPDATE Community_Voice_Channels
       SET name = ?
       WHERE id = ? AND community_id = ?
       LIMIT 1`,
      [name, channelId, communityId],
    );
    await db.execute(
      "DELETE FROM Community_Voice_Channel_Role_Access WHERE community_id = ? AND channel_id = ?",
      [communityId, channelId],
    );
    if (allowedRoleIds.length) {
      const values = allowedRoleIds.map((roleId) => [communityId, channelId, roleId]);
      await db.query(
        "INSERT IGNORE INTO Community_Voice_Channel_Role_Access (community_id, channel_id, role_id) VALUES ?",
        [values],
      );
    }

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
    const canJoin = await canUserJoinVoiceChannel(
      communityId,
      channelId,
      access.customRoleId,
      me.is_admin || access.permissions.can_manage_voice_channels,
    );
    if (!canJoin) {
      return NextResponse.json({ error: "Esta sala está restringida a roles específicos." }, { status: 403 });
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
