import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import {
  ADMIN_PERMISSION_KEYS,
  ADMIN_ROLE_ICON_OPTIONS,
  DEFAULT_ADMIN_ROLE_ICON,
  type AdminRoleIconKey,
  ensureAdminRolesTables,
} from "@/lib/adminPermissions";
import { requireAdminPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  icon_key: string | null;
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
  role_icon_key: string | null;
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

const iconOptionsByKey = new Map(ADMIN_ROLE_ICON_OPTIONS.map((option) => [option.key, option]));

function getRoleIcon(iconKey: string | null): (typeof ADMIN_ROLE_ICON_OPTIONS)[number] {
  const key = iconKey as AdminRoleIconKey;
  return iconOptionsByKey.get(key) ?? iconOptionsByKey.get(DEFAULT_ADMIN_ROLE_ICON)!;
}

export default async function AdminRolesPage() {
  await requireAdminPermission("manage_roles");
  await ensureAdminRolesTables();

  const [roles] = await db.query<RoleRow[]>(
    `SELECT id, name, description, icon_key,
            access_dashboard, manage_users, manage_posts, manage_communities,
            manage_groups, manage_reports, manage_announcements, manage_roles
     FROM Admin_Roles
     ORDER BY id ASC`,
  );

  const [users] = await db.query<UserRow[]>(
    "SELECT id, username FROM Users WHERE visible=1 ORDER BY created_at DESC LIMIT 200",
  );

  const [assignments] = await db.query<AssignmentRow[]>(
    `SELECT aur.user_id, u.username, aur.role_id, r.name AS role_name, r.icon_key AS role_icon_key
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
        <AdminSection title="Diseño de roles" description="Configura identidad visual, permisos y asignaciones en una sola vista.">
          <form action="/api/admin/roles" method="post" className="grid gap-4 rounded-2xl border border-border/70 bg-background/40 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <input type="hidden" name="op" value="create_role" />
            <div className="space-y-3">
              <div className="grid gap-3">
                <input name="name" required placeholder="Nombre del rol" className="rounded-xl border border-border bg-input px-3 py-2 text-sm" />
                <textarea name="description" placeholder="Descripción opcional" className="rounded-xl border border-border bg-input px-3 py-2 text-sm" rows={3} />
              </div>

              <div className="rounded-2xl border border-border/70 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-foreground/60">Permisos del rol</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ADMIN_PERMISSION_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm">
                      <input type="checkbox" name={key} defaultChecked={key === "access_dashboard"} />
                      {labels[key]}
                    </label>
                  ))}
                </div>
              </div>

              <button className="w-full rounded-full border border-border px-4 py-2 text-sm font-semibold">Crear rol</button>
            </div>

            <div className="rounded-2xl border border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-foreground/60">Elige icono (20 opciones)</p>
                <span className="text-xs text-foreground/60">Referencia administrador: 👑</span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {ADMIN_ROLE_ICON_OPTIONS.map((option, index) => (
                  <label
                    key={option.key}
                    title={option.label}
                    className={`relative flex h-12 cursor-pointer items-center justify-center rounded-xl border bg-gradient-to-r px-2 py-2 text-lg ${option.accentClass}`}
                  >
                    <input
                      type="radio"
                      name="icon_key"
                      value={option.key}
                      defaultChecked={index === 0}
                      className="absolute left-1.5 top-1.5 h-3.5 w-3.5 accent-white"
                    />
                    <span aria-hidden>{option.emoji}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </AdminSection>

        <AdminSection title="Roles existentes" description="Edita permisos o elimina roles que ya no necesites.">
          <div className="grid gap-3 xl:grid-cols-2">
            {roles.map((role) => (
              <form key={role.id} action="/api/admin/roles" method="post" className="rounded-2xl border border-border/70 bg-background/30 p-4">
                <input type="hidden" name="op" value="update_role" />
                <input type="hidden" name="role_id" value={role.id} />
                <div className="mb-3 rounded-xl border border-border/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-foreground/60">Icono del rol</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-400/15 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                      {getRoleIcon(role.icon_key).emoji} {role.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {ADMIN_ROLE_ICON_OPTIONS.map((option) => (
                      <label
                        key={`${role.id}-${option.key}`}
                        title={option.label}
                        className={`relative flex h-11 cursor-pointer items-center justify-center rounded-xl border bg-gradient-to-r px-2 py-2 text-base ${option.accentClass}`}
                      >
                        <input
                          type="radio"
                          name="icon_key"
                          value={option.key}
                          defaultChecked={(role.icon_key ?? DEFAULT_ADMIN_ROLE_ICON) === option.key}
                          className="absolute left-1 top-1 h-3.5 w-3.5 accent-white"
                        />
                        <span aria-hidden>{option.emoji}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                  <input name="name" defaultValue={role.name} className="rounded-xl border border-border bg-input px-3 py-2 text-sm" />
                  <button formAction="/api/admin/roles" name="op" value="assign_self_role" className="rounded-full border border-emerald-300/60 px-3 py-1.5 text-xs text-emerald-300">Asignarme</button>
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
                <p>
                  @{row.username} ·{" "}
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
                    {getRoleIcon(row.role_icon_key).emoji} {row.role_name}
                  </span>
                </p>
                <button className="rounded-full border border-border px-3 py-1 text-xs">Quitar</button>
              </form>
            ))}
          </div>
        </AdminSection>
      </AdminShell>
    </>
  );
}
