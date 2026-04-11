import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

export type CommunityPermissionKey =
  | "can_edit_community"
  | "can_manage_roles"
  | "can_kick_members"
  | "can_ban_members"
  | "can_mute_members"
  | "can_manage_chat"
  | "can_manage_voice_channels"
  | "can_chat";

export type CommunityPermissions = Record<CommunityPermissionKey, boolean>;

export type CommunityAccessControl = {
  isMember: boolean;
  baseRole: string | null;
  customRoleId: number | null;
  customRoleName: string | null;
  isBanned: boolean;
  isMuted: boolean;
  permissions: CommunityPermissions;
};

type MemberRoleRow = RowDataPacket & { role: string | null };
type AssignedRoleRow = RowDataPacket & {
  id: number;
  name: string;
  can_edit_community: number;
  can_manage_roles: number;
  can_kick_members: number;
  can_ban_members: number;
  can_mute_members: number;
  can_manage_chat: number;
  can_manage_voice_channels: number;
  can_chat: number;
};
type BanRow = RowDataPacket & { id: number };
type MuteRow = RowDataPacket & { id: number };

let aclTablesReady: Promise<void> | null = null;

function normalizeBaseRole(role: string | null | undefined) {
  const normalized = String(role || "member").toLowerCase();
  if (normalized === "owner" || normalized === "admin" || normalized === "moderator") {
    return normalized;
  }
  return "member";
}

function basePermissionsForRole(baseRole: string): CommunityPermissions {
  if (baseRole === "owner") {
    return {
      can_edit_community: true,
      can_manage_roles: true,
      can_kick_members: true,
      can_ban_members: true,
      can_mute_members: true,
      can_manage_chat: true,
      can_manage_voice_channels: true,
      can_chat: true,
    };
  }

  if (baseRole === "admin") {
    return {
      can_edit_community: true,
      can_manage_roles: true,
      can_kick_members: true,
      can_ban_members: true,
      can_mute_members: true,
      can_manage_chat: true,
      can_manage_voice_channels: true,
      can_chat: true,
    };
  }

  if (baseRole === "moderator") {
    return {
      can_edit_community: true,
      can_manage_roles: false,
      can_kick_members: true,
      can_ban_members: true,
      can_mute_members: true,
      can_manage_chat: true,
      can_manage_voice_channels: true,
      can_chat: true,
    };
  }

  return {
    can_edit_community: false,
    can_manage_roles: false,
    can_kick_members: false,
    can_ban_members: false,
    can_mute_members: false,
    can_manage_chat: false,
    can_manage_voice_channels: false,
    can_chat: true,
  };
}

function parseRolePermissions(row: AssignedRoleRow | null): Partial<CommunityPermissions> {
  if (!row) return {};
  return {
    can_edit_community: Boolean(row.can_edit_community),
    can_manage_roles: Boolean(row.can_manage_roles),
    can_kick_members: Boolean(row.can_kick_members),
    can_ban_members: Boolean(row.can_ban_members),
    can_mute_members: Boolean(row.can_mute_members),
    can_manage_chat: Boolean(row.can_manage_chat),
    can_manage_voice_channels: Boolean(row.can_manage_voice_channels),
    can_chat: Boolean(row.can_chat),
  };
}

export function mergeCommunityPermissions(
  base: CommunityPermissions,
  custom: Partial<CommunityPermissions>,
): CommunityPermissions {
  return {
    can_edit_community: base.can_edit_community || Boolean(custom.can_edit_community),
    can_manage_roles: base.can_manage_roles || Boolean(custom.can_manage_roles),
    can_kick_members: base.can_kick_members || Boolean(custom.can_kick_members),
    can_ban_members: base.can_ban_members || Boolean(custom.can_ban_members),
    can_mute_members: base.can_mute_members || Boolean(custom.can_mute_members),
    can_manage_chat: base.can_manage_chat || Boolean(custom.can_manage_chat),
    can_manage_voice_channels: base.can_manage_voice_channels || Boolean(custom.can_manage_voice_channels),
    can_chat: base.can_chat || Boolean(custom.can_chat),
  };
}

export async function ensureCommunityAclTables() {
  if (!aclTablesReady) {
    aclTablesReady = (async () => {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Roles (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          name VARCHAR(60) NOT NULL,
          can_edit_community TINYINT(1) NOT NULL DEFAULT 0,
          can_manage_roles TINYINT(1) NOT NULL DEFAULT 0,
          can_kick_members TINYINT(1) NOT NULL DEFAULT 0,
          can_ban_members TINYINT(1) NOT NULL DEFAULT 0,
          can_mute_members TINYINT(1) NOT NULL DEFAULT 0,
          can_manage_chat TINYINT(1) NOT NULL DEFAULT 0,
          can_manage_voice_channels TINYINT(1) NOT NULL DEFAULT 0,
          can_chat TINYINT(1) NOT NULL DEFAULT 1,
          created_by BIGINT UNSIGNED NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_community_role_name (community_id, name),
          KEY idx_community_roles_community (community_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [voiceManagePermissionColumn] = await db.query<RowDataPacket[]>(
        "SHOW COLUMNS FROM Community_Roles LIKE 'can_manage_voice_channels'",
      );
      if (!voiceManagePermissionColumn.length) {
        await db.execute(
          "ALTER TABLE Community_Roles ADD COLUMN can_manage_voice_channels TINYINT(1) NOT NULL DEFAULT 0 AFTER can_manage_chat",
        );
      }

      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Role_Members (
          community_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          role_id BIGINT UNSIGNED NOT NULL,
          assigned_by BIGINT UNSIGNED NULL,
          assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (community_id, user_id),
          KEY idx_community_role_members_role (role_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Bans (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          banned_by BIGINT UNSIGNED NOT NULL,
          reason VARCHAR(280) NULL,
          expires_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_community_bans_member (community_id, user_id),
          KEY idx_community_bans_lookup (community_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await db.execute(
        `CREATE TABLE IF NOT EXISTS Community_Mutes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          community_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          muted_by BIGINT UNSIGNED NOT NULL,
          reason VARCHAR(280) NULL,
          expires_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_community_mutes_member (community_id, user_id),
          KEY idx_community_mutes_lookup (community_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    })();
  }

  await aclTablesReady;
}

export async function getCommunityAccessControl(
  communityId: number,
  userId: number,
): Promise<CommunityAccessControl> {
  await ensureCommunityAclTables();

  const [membershipRows] = await db.query<MemberRoleRow[]>(
    `SELECT role
     FROM Community_Members
     WHERE community_id = ? AND user_id = ?
     LIMIT 1`,
    [communityId, userId],
  );

  const memberRow = membershipRows[0] ?? null;
  const baseRole = memberRow ? normalizeBaseRole(memberRow.role) : null;
  const basePermissions = basePermissionsForRole(baseRole ?? "member");

  const [roleRows] = await db.query<AssignedRoleRow[]>(
    `SELECT r.id, r.name,
            r.can_edit_community,
            r.can_manage_roles,
            r.can_kick_members,
            r.can_ban_members,
            r.can_mute_members,
            r.can_manage_chat,
            r.can_manage_voice_channels,
            r.can_chat
     FROM Community_Role_Members rm
     JOIN Community_Roles r ON r.id = rm.role_id
     WHERE rm.community_id = ? AND rm.user_id = ?
     LIMIT 1`,
    [communityId, userId],
  );

  const assignedRole = roleRows[0] ?? null;

  const [banRows] = await db.query<BanRow[]>(
    `SELECT id
     FROM Community_Bans
     WHERE community_id = ?
       AND user_id = ?
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [communityId, userId],
  );

  const [muteRows] = await db.query<MuteRow[]>(
    `SELECT id
     FROM Community_Mutes
     WHERE community_id = ?
       AND user_id = ?
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [communityId, userId],
  );

  return {
    isMember: Boolean(memberRow),
    baseRole,
    customRoleId: assignedRole ? Number(assignedRole.id) : null,
    customRoleName: assignedRole ? String(assignedRole.name) : null,
    isBanned: banRows.length > 0,
    isMuted: muteRows.length > 0,
    permissions: mergeCommunityPermissions(basePermissions, parseRolePermissions(assignedRole)),
  };
}
