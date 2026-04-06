import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_PERMISSION_KEYS, ensureAdminRolesTables } from "@/lib/adminPermissions";
import { requireAdminPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  access_dashboard: number;
  manage_users: number;
  manage_posts: number;
  manage_communities: number;
  manage_groups: number;
  manage_reports: number;
  manage_announcements: number;
  manage_roles: number;
};

type AssignmentRow = RowDataPacket & {
  user_id: number;
  username: string;
  role_id: number;
  role_name: string;
};

type UserRow = RowDataPacket & {
  id: number;
  username: string;
};

const labels: Record<(typeof ADMIN_PERMISSION_KEYS)[number], string> = {
  access_dashboard: "Entrar al panel",
  manage_users: "Gestionar usuarios",
  manage_posts: "Gestionar posts",
  manage_communities: "Gestionar comunidades",
  manage_groups: "Gestionar grupos",
  manage_reports: "Gestionar reportes",
  manage_announcements: "Gestionar anuncios",
  manage_roles: "Gestionar roles admin",
};

export default async function AdminRolesPage() {
  await requireAdminPermission("manage_roles");
  await ensureAdminRolesTables();

  const [roles] = await db.query<RoleRow[]>(
    `SELECT id, name, description,
            access_dashboard, manage_users, manage_posts, manage_communities,
            manage_groups, manage_reports, manage_announcements, manage_roles
     FROM Admin_Roles
     ORDER BY id ASC`,
  );

  const [users] = await db.query<UserRow[]>(
    "SELECT id, username FROM Users WHERE visible=1 ORDER BY created_at DESC LIMIT 200",
  );

  const [assignments] = await db.query<AssignmentRow[]>(
    `SELECT aur.user_id, u.username, aur.role_id, r.name AS role_name
     FROM Admin_User_Roles aur
     JOIN Users u ON u.id = aur.user_id
     JOIN Admin_Roles r ON r.id = aur.role_id
     ORDER BY aur.assigned_at DESC
     LIMIT 300`,
  );

  return (
    <>
      <Navbar />
      <AdminShell title="Roles del dashboard admin" subtitle="Crea roles de administración personalizados y asigna permisos granulares por módulo.">
        <AdminSection title="Crear rol" description="Define permisos para cada sección del dashboard.">
          <form action="/api/admin/roles" method="post" className="grid gap-3 rounded-2xl border border-border/70 p-4">
            <input type="hidden" name="op" value="create_role" />
            <input name="name" required placeholder="Nombre del rol" className="rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            <textarea name="description" placeholder="Descripción opcional" className="rounded-xl border border-border bg-input px-3 py-2 text-sm" rows={2} />
            <div className="grid gap-2 sm:grid-cols-2">
              {ADMIN_PERMISSION_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm">
                  <input type="checkbox" name={key} defaultChecked={key === "access_dashboard"} />
                  {labels[key]}
                </label>
              ))}
            </div>
            <button className="rounded-full border border-border px-4 py-2 text-sm">Crear rol</button>
          </form>
        </AdminSection>

        <AdminSection title="Roles existentes" description="Edita permisos o elimina roles que ya no necesites.">
          <div className="space-y-3">
            {roles.map((role) => (
              <form key={role.id} action="/api/admin/roles" method="post" className="rounded-2xl border border-border/70 p-4">
                <input type="hidden" name="op" value="update_role" />
                <input type="hidden" name="role_id" value={role.id} />
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <input name="name" defaultValue={role.name} className="rounded-xl border border-border bg-input px-3 py-2 text-sm" />
                  <button formAction="/api/admin/roles" name="op" value="delete_role" className="rounded-full border border-rose-300/60 px-3 py-1.5 text-xs text-rose-300">Eliminar rol</button>
                </div>
                <textarea name="description" defaultValue={role.description ?? ""} className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" rows={2} />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {ADMIN_PERMISSION_KEYS.map((key) => (
                    <label key={`${role.id}-${key}`} className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm">
                      <input type="checkbox" name={key} defaultChecked={Boolean((role as Record<string, unknown>)[key])} />
                      {labels[key]}
                    </label>
                  ))}
                </div>
                <button className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs">Guardar cambios</button>
              </form>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Asignar roles a usuarios" description="Un usuario puede tener múltiples roles.">
          <form action="/api/admin/roles" method="post" className="grid gap-2 rounded-2xl border border-border/70 p-4 sm:grid-cols-3 sm:items-end">
            <input type="hidden" name="op" value="assign_role" />
            <label className="text-xs">
              Usuario
              <select name="user_id" className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                {users.map((user) => <option key={user.id} value={user.id}>@{user.username}</option>)}
              </select>
            </label>
            <label className="text-xs">
              Rol
              <select name="role_id" className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <button className="rounded-full border border-border px-4 py-2 text-sm">Asignar</button>
          </form>

          <div className="mt-4 space-y-2">
            {assignments.map((row) => (
              <form key={`${row.user_id}-${row.role_id}`} action="/api/admin/roles" method="post" className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
                <input type="hidden" name="op" value="remove_assignment" />
                <input type="hidden" name="user_id" value={row.user_id} />
                <input type="hidden" name="role_id" value={row.role_id} />
                <p>@{row.username} · <span className="opacity-75">{row.role_name}</span></p>
                <button className="rounded-full border border-border px-3 py-1 text-xs">Quitar</button>
              </form>
            ))}
          </div>
        </AdminSection>
      </AdminShell>
    </>
  );
}
