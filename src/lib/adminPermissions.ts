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

  await db.execute(
    `CREATE TABLE IF NOT EXISTS Admin_User_Roles (
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      assigned_by INT NULL,
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
      access_dashboard,
      manage_users,
      manage_posts,
      manage_communities,
      manage_groups,
      manage_reports,
      manage_announcements,
      manage_roles
    ) VALUES ('Super Admin Legacy', 'Rol automático para cuentas con is_admin=1', 1, 1, 1, 1, 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE description=VALUES(description), updated_at=CURRENT_TIMESTAMP`,
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
