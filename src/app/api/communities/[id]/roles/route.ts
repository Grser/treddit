import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCommunityAclTables, getCommunityAccessControl } from "@/lib/communityPermissions";

type Params = { params: Promise<{ id: string }> };

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  can_edit_community: number;
  can_manage_roles: number;
  can_kick_members: number;
  can_ban_members: number;
  can_mute_members: number;
  can_manage_chat: number;
  can_chat: number;
};

type MemberRow = RowDataPacket & {
  user_id: number;
  username: string;
  nickname: string | null;
  base_role: string | null;
  role_id: number | null;
};

function toBool(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function canTargetUser(actorIsSiteAdmin: boolean, actorId: number, targetId: number, targetBaseRole: string | null) {
  if (targetId === actorId) return false;
  const normalized = String(targetBaseRole || "member").toLowerCase();
  if (!actorIsSiteAdmin && normalized === "owner") return false;
  return true;
}

async function getMemberBaseRole(communityId: number, userId: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT role
     FROM Community_Members
     WHERE community_id = ? AND user_id = ?
     LIMIT 1`,
    [communityId, userId],
  );
  return rows[0]?.role ? String(rows[0].role) : null;
}

async function getCommunityRolesPayload(communityId: number) {
  const [rolesRows] = await db.query<RoleRow[]>(
    `SELECT id, name,
            can_edit_community,
            can_manage_roles,
            can_kick_members,
            can_ban_members,
            can_mute_members,
            can_manage_chat,
            can_chat
     FROM Community_Roles
     WHERE community_id = ?
     ORDER BY name ASC`,
    [communityId],
  );

  const [membersRows] = await db.query<MemberRow[]>(
    `SELECT u.id AS user_id,
            u.username,
            u.nickname,
            cm.role AS base_role,
            rm.role_id
     FROM Community_Members cm
     JOIN Users u ON u.id = cm.user_id
     LEFT JOIN Community_Role_Members rm
       ON rm.community_id = cm.community_id
      AND rm.user_id = cm.user_id
     WHERE cm.community_id = ?
     ORDER BY FIELD(LOWER(COALESCE(cm.role, 'member')), 'owner', 'admin', 'moderator', 'member'), u.username ASC
     LIMIT 200`,
    [communityId],
  );

  return {
    roles: rolesRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      can_edit_community: Boolean(row.can_edit_community),
      can_manage_roles: Boolean(row.can_manage_roles),
      can_kick_members: Boolean(row.can_kick_members),
      can_ban_members: Boolean(row.can_ban_members),
      can_mute_members: Boolean(row.can_mute_members),
      can_manage_chat: Boolean(row.can_manage_chat),
      can_chat: Boolean(row.can_chat),
    })),
    members: membersRows.map((row) => ({
      id: Number(row.user_id),
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
      base_role: row.base_role ? String(row.base_role) : "member",
      role_id: row.role_id ? Number(row.role_id) : null,
    })),
  };
}

export async function GET(_: Request, { params }: Params) {
  await ensureCommunityAclTables();
  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const access = await getCommunityAccessControl(communityId, me.id);
  if ((!access.isMember || !access.permissions.can_manage_roles) && !me.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(await getCommunityRolesPayload(communityId));
}

export async function POST(req: Request, { params }: Params) {
  await ensureCommunityAclTables();
  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const access = await getCommunityAccessControl(communityId, me.id);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "create_role" || action === "update_role" || action === "delete_role" || action === "assign_role") {
    if ((!access.isMember || !access.permissions.can_manage_roles) && !me.is_admin) {
      return NextResponse.json({ error: "No tienes permisos para gestionar roles" }, { status: 403 });
    }
  }

  if (action === "member_action") {
    if ((!access.isMember || (!access.permissions.can_kick_members && !access.permissions.can_ban_members && !access.permissions.can_mute_members)) && !me.is_admin) {
      return NextResponse.json({ error: "No tienes permisos para moderar miembros" }, { status: 403 });
    }
  }

  if (action === "create_role") {
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "Nombre de rol inválido" }, { status: 400 });
    }

    await db.execute(
      `INSERT INTO Community_Roles (
         community_id, name,
         can_edit_community,
         can_manage_roles,
         can_kick_members,
         can_ban_members,
         can_mute_members,
         can_manage_chat,
         can_chat,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        communityId,
        name,
        toBool(body?.can_edit_community) ? 1 : 0,
        toBool(body?.can_manage_roles) ? 1 : 0,
        toBool(body?.can_kick_members) ? 1 : 0,
        toBool(body?.can_ban_members) ? 1 : 0,
        toBool(body?.can_mute_members) ? 1 : 0,
        toBool(body?.can_manage_chat) ? 1 : 0,
        toBool(body?.can_chat) ? 1 : 0,
        me.id,
      ],
    );

    return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
  }

  if (action === "update_role") {
    const roleId = Number(body?.roleId);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";

    if (!Number.isInteger(roleId) || roleId <= 0 || !name) {
      return NextResponse.json({ error: "Datos del rol inválidos" }, { status: 400 });
    }

    await db.execute(
      `UPDATE Community_Roles
       SET name = ?,
           can_edit_community = ?,
           can_manage_roles = ?,
           can_kick_members = ?,
           can_ban_members = ?,
           can_mute_members = ?,
           can_manage_chat = ?,
           can_chat = ?
       WHERE id = ? AND community_id = ?
       LIMIT 1`,
      [
        name,
        toBool(body?.can_edit_community) ? 1 : 0,
        toBool(body?.can_manage_roles) ? 1 : 0,
        toBool(body?.can_kick_members) ? 1 : 0,
        toBool(body?.can_ban_members) ? 1 : 0,
        toBool(body?.can_mute_members) ? 1 : 0,
        toBool(body?.can_manage_chat) ? 1 : 0,
        toBool(body?.can_chat) ? 1 : 0,
        roleId,
        communityId,
      ],
    );

    return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
  }

  if (action === "delete_role") {
    const roleId = Number(body?.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    await db.execute("DELETE FROM Community_Role_Members WHERE community_id = ? AND role_id = ?", [communityId, roleId]);
    await db.execute("DELETE FROM Community_Roles WHERE id = ? AND community_id = ? LIMIT 1", [roleId, communityId]);

    return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
  }

  if (action === "assign_role") {
    const roleId = body?.roleId == null ? null : Number(body.roleId);
    const targetUserId = Number(body?.targetUserId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    const targetBaseRole = await getMemberBaseRole(communityId, targetUserId);
    if (!targetBaseRole) {
      return NextResponse.json({ error: "El usuario no pertenece a la comunidad" }, { status: 400 });
    }

    if (!canTargetUser(Boolean(me.is_admin), me.id, targetUserId, targetBaseRole)) {
      return NextResponse.json({ error: "No puedes modificar este usuario" }, { status: 403 });
    }

    if (roleId == null) {
      await db.execute(
        "DELETE FROM Community_Role_Members WHERE community_id = ? AND user_id = ?",
        [communityId, targetUserId],
      );
      return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
    }

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const [roleRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM Community_Roles WHERE id = ? AND community_id = ? LIMIT 1",
      [roleId, communityId],
    );
    if (roleRows.length === 0) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    }

    await db.execute(
      `INSERT INTO Community_Role_Members (community_id, user_id, role_id, assigned_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), assigned_by = VALUES(assigned_by), assigned_at = CURRENT_TIMESTAMP`,
      [communityId, targetUserId, roleId, me.id],
    );

    return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
  }

  if (action === "member_action") {
    const targetUserId = Number(body?.targetUserId);
    const moderationAction = String(body?.moderationAction || "");
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 280) : null;
    const minutes = Number(body?.minutes || 0);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    const targetBaseRole = await getMemberBaseRole(communityId, targetUserId);

    if ((moderationAction === "kick" || moderationAction === "ban" || moderationAction === "mute") && !targetBaseRole) {
      return NextResponse.json({ error: "El usuario no pertenece a la comunidad" }, { status: 400 });
    }

    if ((moderationAction === "kick" || moderationAction === "ban" || moderationAction === "mute") && !canTargetUser(Boolean(me.is_admin), me.id, targetUserId, targetBaseRole)) {
      return NextResponse.json({ error: "No puedes moderar este usuario" }, { status: 403 });
    }

    if (moderationAction === "kick") {
      if (!access.permissions.can_kick_members && !me.is_admin) {
        return NextResponse.json({ error: "No tienes permiso para expulsar miembros" }, { status: 403 });
      }
      await db.execute("DELETE FROM Community_Role_Members WHERE community_id = ? AND user_id = ?", [communityId, targetUserId]);
      await db.execute("DELETE FROM Community_Members WHERE community_id = ? AND user_id = ?", [communityId, targetUserId]);
      return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
    }

    if (moderationAction === "ban") {
      if (!access.permissions.can_ban_members && !me.is_admin) {
        return NextResponse.json({ error: "No tienes permiso para banear" }, { status: 403 });
      }
      const expiresAt = Number.isFinite(minutes) && minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;

      await db.execute(
        `INSERT INTO Community_Bans (community_id, user_id, banned_by, reason, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE banned_by = VALUES(banned_by), reason = VALUES(reason), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP`,
        [communityId, targetUserId, me.id, reason, expiresAt],
      );
      await db.execute("DELETE FROM Community_Role_Members WHERE community_id = ? AND user_id = ?", [communityId, targetUserId]);
      await db.execute("DELETE FROM Community_Members WHERE community_id = ? AND user_id = ?", [communityId, targetUserId]);

      return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
    }

    if (moderationAction === "mute") {
      if (!access.permissions.can_mute_members && !me.is_admin) {
        return NextResponse.json({ error: "No tienes permiso para silenciar" }, { status: 403 });
      }
      const expiresAt = Number.isFinite(minutes) && minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;
      await db.execute(
        `INSERT INTO Community_Mutes (community_id, user_id, muted_by, reason, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE muted_by = VALUES(muted_by), reason = VALUES(reason), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP`,
        [communityId, targetUserId, me.id, reason, expiresAt],
      );
      return NextResponse.json({ ok: true, ...(await getCommunityRolesPayload(communityId)) });
    }

    if (moderationAction === "unban") {
      if (!access.permissions.can_ban_members && !me.is_admin) {
        return NextResponse.json({ error: "No tienes permiso para desbanear" }, { status: 403 });
      }
      await db.execute("DELETE FROM Community_Bans WHERE community_id = ? AND user_id = ?", [communityId, targetUserId]);
      return NextResponse.json({ ok: true });
    }

    if (moderationAction === "unmute") {
      if (!access.permissions.can_mute_members && !me.is_admin) {
        return NextResponse.json({ error: "No tienes permiso para quitar silencio" }, { status: 403 });
      }
      await db.execute("DELETE FROM Community_Mutes WHERE community_id = ? AND user_id = ?", [communityId, targetUserId]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}
