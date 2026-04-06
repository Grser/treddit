export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSION_KEYS, ensureAdminRolesTables } from "@/lib/adminPermissions";
import { db } from "@/lib/db";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

function toFlag(value: FormDataEntryValue | null) {
  return value === "on" || value === "1" || value === "true" ? 1 : 0;
}

export async function POST(req: Request) {
  const me = await requireAdminPermission("manage_roles");
  await ensureAdminRolesTables();

  const form = await req.formData();
  const op = String(form.get("op") || "");
  const baseUrl = await getRequestBaseUrl();

  if (op === "create_role") {
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim() || null;
    if (!name) {
      return NextResponse.redirect(new URL("/admin/roles?error=missing_name", baseUrl));
    }

    const flags = ADMIN_PERMISSION_KEYS.map((key) => toFlag(form.get(key)));
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, ...flags],
    );
    return NextResponse.redirect(new URL("/admin/roles?ok=created", baseUrl));
  }

  if (op === "update_role") {
    const roleId = Number(form.get("role_id") || 0);
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim() || null;
    if (!roleId || !name) {
      return NextResponse.redirect(new URL("/admin/roles?error=invalid_role", baseUrl));
    }
    const flags = ADMIN_PERMISSION_KEYS.map((key) => toFlag(form.get(key)));
    await db.execute(
      `UPDATE Admin_Roles
       SET name=?,
           description=?,
           access_dashboard=?,
           manage_users=?,
           manage_posts=?,
           manage_communities=?,
           manage_groups=?,
           manage_reports=?,
           manage_announcements=?,
           manage_roles=?
       WHERE id=?
       LIMIT 1`,
      [name, description, ...flags, roleId],
    );
    return NextResponse.redirect(new URL("/admin/roles?ok=updated", baseUrl));
  }

  if (op === "delete_role") {
    const roleId = Number(form.get("role_id") || 0);
    if (!roleId) return NextResponse.redirect(new URL("/admin/roles?error=invalid_role", baseUrl));
    await db.execute("DELETE FROM Admin_User_Roles WHERE role_id=?", [roleId]);
    await db.execute("DELETE FROM Admin_Roles WHERE id=? LIMIT 1", [roleId]);
    return NextResponse.redirect(new URL("/admin/roles?ok=deleted", baseUrl));
  }

  if (op === "assign_role") {
    const userId = Number(form.get("user_id") || 0);
    const roleId = Number(form.get("role_id") || 0);
    if (!userId || !roleId) {
      return NextResponse.redirect(new URL("/admin/roles?error=invalid_assignment", baseUrl));
    }
    await db.execute(
      `INSERT INTO Admin_User_Roles (user_id, role_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), assigned_at = CURRENT_TIMESTAMP`,
      [userId, roleId, me.id],
    );
    return NextResponse.redirect(new URL("/admin/roles?ok=assigned", baseUrl));
  }

  if (op === "remove_assignment") {
    const userId = Number(form.get("user_id") || 0);
    const roleId = Number(form.get("role_id") || 0);
    if (!userId || !roleId) {
      return NextResponse.redirect(new URL("/admin/roles?error=invalid_assignment", baseUrl));
    }
    await db.execute("DELETE FROM Admin_User_Roles WHERE user_id=? AND role_id=?", [userId, roleId]);
    return NextResponse.redirect(new URL("/admin/roles?ok=removed", baseUrl));
  }

  return NextResponse.redirect(new URL("/admin/roles", baseUrl));
}
