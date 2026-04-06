import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

export const ADMIN_PERMISSION_KEYS = [
  "access_dashboard",
  "manage_users",
  "manage_posts",
  "manage_communities",
  "manage_groups",
  "manage_reports",
  "manage_announcements",
  "manage_roles",
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number];

export type AdminPermissionMap = Record<AdminPermissionKey, boolean>;

export const ADMIN_ROLE_ICON_OPTIONS = [
  { key: "shield-crown", emoji: "👑", label: "Administrador", accentClass: "from-fuchsia-500/30 to-violet-500/30 border-fuchsia-300/40 text-fuchsia-100" },
  { key: "shield-bolt", emoji: "⚡", label: "Moderador rápido", accentClass: "from-amber-500/30 to-yellow-500/20 border-amber-300/40 text-amber-100" },
  { key: "shield-star", emoji: "🌟", label: "Supervisor", accentClass: "from-sky-500/30 to-blue-500/20 border-sky-300/40 text-sky-100" },
  { key: "rocket", emoji: "🚀", label: "Lanzamientos", accentClass: "from-indigo-500/30 to-blue-500/20 border-indigo-300/40 text-indigo-100" },
  { key: "target", emoji: "🎯", label: "Objetivos", accentClass: "from-rose-500/30 to-pink-500/20 border-rose-300/40 text-rose-100" },
  { key: "compass", emoji: "🧭", label: "Guía", accentClass: "from-cyan-500/30 to-teal-500/20 border-cyan-300/40 text-cyan-100" },
  { key: "lock", emoji: "🔒", label: "Seguridad", accentClass: "from-slate-500/30 to-zinc-500/20 border-slate-300/40 text-slate-100" },
  { key: "megaphone", emoji: "📣", label: "Comunicaciones", accentClass: "from-orange-500/30 to-amber-500/20 border-orange-300/40 text-orange-100" },
  { key: "fire", emoji: "🔥", label: "Tendencias", accentClass: "from-red-500/30 to-orange-500/20 border-red-300/40 text-red-100" },
  { key: "gem", emoji: "💎", label: "Elite", accentClass: "from-violet-500/30 to-fuchsia-500/20 border-violet-300/40 text-violet-100" },
  { key: "satellite", emoji: "🛰️", label: "Monitoreo", accentClass: "from-blue-500/30 to-cyan-500/20 border-blue-300/40 text-blue-100" },
  { key: "brain", emoji: "🧠", label: "Estrategia", accentClass: "from-purple-500/30 to-indigo-500/20 border-purple-300/40 text-purple-100" },
  { key: "hammer", emoji: "🔨", label: "Operaciones", accentClass: "from-emerald-500/30 to-green-500/20 border-emerald-300/40 text-emerald-100" },
  { key: "leaf", emoji: "🍃", label: "Bienestar", accentClass: "from-lime-500/30 to-green-500/20 border-lime-300/40 text-lime-100" },
  { key: "palette", emoji: "🎨", label: "Creativo", accentClass: "from-pink-500/30 to-rose-500/20 border-pink-300/40 text-pink-100" },
  { key: "books", emoji: "📚", label: "Documentación", accentClass: "from-amber-600/30 to-orange-500/20 border-amber-400/40 text-amber-100" },
  { key: "lifebuoy", emoji: "🛟", label: "Soporte", accentClass: "from-cyan-500/30 to-sky-500/20 border-cyan-300/40 text-cyan-100" },
  { key: "planet", emoji: "🪐", label: "Expansión", accentClass: "from-indigo-600/30 to-purple-500/20 border-indigo-400/40 text-indigo-100" },
  { key: "sparkles", emoji: "✨", label: "Calidad", accentClass: "from-yellow-500/30 to-amber-500/20 border-yellow-300/40 text-yellow-100" },
  { key: "robot", emoji: "🤖", label: "Automatización", accentClass: "from-teal-500/30 to-cyan-500/20 border-teal-300/40 text-teal-100" },
] as const;

export type AdminRoleIconKey = (typeof ADMIN_ROLE_ICON_OPTIONS)[number]["key"];
export const DEFAULT_ADMIN_ROLE_ICON: AdminRoleIconKey = "shield-crown";

const defaultPermissions: AdminPermissionMap = {
  access_dashboard: false,
  manage_users: false,
  manage_posts: false,
  manage_communities: false,
  manage_groups: false,
  manage_reports: false,
  manage_announcements: false,
  manage_roles: false,
};

type HasTableRow = RowDataPacket & { table_name: string };
type UserIdColumnRow = RowDataPacket & { column_type: string };
type HasColumnRow = RowDataPacket & { column_name: string };

type RolesPermissionRow = RowDataPacket & {
  access_dashboard: number;
  manage_users: number;
  manage_posts: number;
  manage_communities: number;
  manage_groups: number;
  manage_reports: number;
  manage_announcements: number;
  manage_roles: number;
};

export async function ensureAdminRolesTables() {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS Admin_Roles (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      description VARCHAR(255) NULL,
      access_dashboard TINYINT(1) NOT NULL DEFAULT 1,
      manage_users TINYINT(1) NOT NULL DEFAULT 0,
      manage_posts TINYINT(1) NOT NULL DEFAULT 0,
      manage_communities TINYINT(1) NOT NULL DEFAULT 0,
      manage_groups TINYINT(1) NOT NULL DEFAULT 0,
      manage_reports TINYINT(1) NOT NULL DEFAULT 0,
      manage_announcements TINYINT(1) NOT NULL DEFAULT 0,
      manage_roles TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_admin_roles_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  const [iconColumnRows] = await db.query<HasColumnRow[]>(
    `SELECT COLUMN_NAME AS column_name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Admin_Roles' AND COLUMN_NAME = 'icon_key'
     LIMIT 1`,
  );

  if (!iconColumnRows.length) {
    await db.execute(
      "ALTER TABLE Admin_Roles ADD COLUMN icon_key VARCHAR(40) NOT NULL DEFAULT 'shield-crown' AFTER description",
    );
  }

  const [userIdRows] = await db.query<UserIdColumnRow[]>(
    `SELECT COLUMN_TYPE AS column_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'id'
     LIMIT 1`,
  );
  if (!userIdRows.length) return;

  const userIdColumnType = userIdRows[0].column_type.toUpperCase();

  await db.execute(
    `CREATE TABLE IF NOT EXISTS Admin_User_Roles (
      user_id ${userIdColumnType} NOT NULL,
      role_id INT NOT NULL,
      assigned_by ${userIdColumnType} NULL,
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id),
      CONSTRAINT fk_admin_user_roles_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_admin_user_roles_role FOREIGN KEY (role_id) REFERENCES Admin_Roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_admin_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES Users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function getAdminPermissions(userId: number): Promise<AdminPermissionMap> {
  await ensureAdminRolesTables();

  const [rows] = await db.query<RolesPermissionRow[]>(
    `SELECT
      MAX(r.access_dashboard) AS access_dashboard,
      MAX(r.manage_users) AS manage_users,
      MAX(r.manage_posts) AS manage_posts,
      MAX(r.manage_communities) AS manage_communities,
      MAX(r.manage_groups) AS manage_groups,
      MAX(r.manage_reports) AS manage_reports,
      MAX(r.manage_announcements) AS manage_announcements,
      MAX(r.manage_roles) AS manage_roles
     FROM Admin_User_Roles ur
     JOIN Admin_Roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId],
  );

  const row = rows[0];
  if (!row) return { ...defaultPermissions };

  return {
    access_dashboard: Boolean(row.access_dashboard),
    manage_users: Boolean(row.manage_users),
    manage_posts: Boolean(row.manage_posts),
    manage_communities: Boolean(row.manage_communities),
    manage_groups: Boolean(row.manage_groups),
    manage_reports: Boolean(row.manage_reports),
    manage_announcements: Boolean(row.manage_announcements),
    manage_roles: Boolean(row.manage_roles),
  };
}

export async function ensureDefaultAdminManagerRole() {
  await ensureAdminRolesTables();
  const [tableRows] = await db.query<HasTableRow[]>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' LIMIT 1",
  );
  if (!tableRows.length) return;

  await db.execute(
    `INSERT INTO Admin_Roles (
      name,
      description,
      icon_key,
      access_dashboard,
      manage_users,
      manage_posts,
      manage_communities,
      manage_groups,
      manage_reports,
      manage_announcements,
      manage_roles
    ) VALUES ('Super Admin Legacy', 'Rol automático para cuentas con is_admin=1', 'shield-crown', 1, 1, 1, 1, 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE description=VALUES(description), icon_key=VALUES(icon_key), updated_at=CURRENT_TIMESTAMP`,
  );

  await db.execute(
    `INSERT IGNORE INTO Admin_User_Roles (user_id, role_id, assigned_by)
     SELECT u.id, r.id, NULL
     FROM Users u
     JOIN Admin_Roles r ON r.name='Super Admin Legacy'
     WHERE u.is_admin = 1`,
  );
}

export function normalizeAdminPermissions(raw: Record<string, unknown>): AdminPermissionMap {
  return {
    access_dashboard: Boolean(raw.access_dashboard),
    manage_users: Boolean(raw.manage_users),
    manage_posts: Boolean(raw.manage_posts),
    manage_communities: Boolean(raw.manage_communities),
    manage_groups: Boolean(raw.manage_groups),
    manage_reports: Boolean(raw.manage_reports),
    manage_announcements: Boolean(raw.manage_announcements),
    manage_roles: Boolean(raw.manage_roles),
  };
}
