import type { RowDataPacket } from "mysql2";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

import Navbar from "@/components/Navbar";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type AdminUserRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  is_admin: number;
  is_verified: number;
  visible: number;
};

type AdminUser = {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  isAdmin: boolean;
  isVerified: boolean;
  visible: boolean;
};

export default async function AdminUsers({ searchParams }: PageProps) {
  await requireAdmin();
  const params = searchParams ? await searchParams : {};
  const passwordUpdated = params.password === "updated";
  const passwordError = params.password === "error";
  const [rows] = await db.query<AdminUserRow[]>(
    "SELECT id, username, nickname, email, is_admin, is_verified, visible, created_at FROM Users ORDER BY created_at DESC LIMIT 200"
  );
  const users: AdminUser[] = rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    email: String(row.email),
    isAdmin: Boolean(row.is_admin),
    isVerified: Boolean(row.is_verified),
    visible: Boolean(row.visible),
  }));
  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-6xl p-6">
        <h2 id="verification" className="mb-4 text-xl font-semibold">Usuarios</h2>
        {passwordUpdated && (
          <p className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            Contraseña actualizada correctamente.
          </p>
        )}
        {passwordError && (
          <p className="mb-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            No se pudo actualizar la contraseña. Debe tener al menos 6 caracteres.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2 pr-4">Verificado</th>
                <th className="py-2 pr-4">Visible</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{u.id}</td>
                  <td className="py-2 pr-4">
                    <div className="font-semibold">@{u.username}</div>
                    {u.nickname && <div className="text-xs opacity-70">{u.nickname}</div>}
                  </td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u.isAdmin ? "Sí" : "No"}</td>
                  <td className="py-2 pr-4">{u.isVerified ? "Sí" : "No"}</td>
                  <td className="py-2 pr-4">{u.visible ? "Sí" : "No"}</td>
                  <td className="space-x-3 whitespace-nowrap py-2 pr-4">
                    <form action={`/api/admin/users/${u.id}`} method="post" className="inline">
                      <input type="hidden" name="op" value={u.isAdmin ? "revoke_admin" : "make_admin"} />
                      <button className="underline">{u.isAdmin ? "Quitar admin" : "Hacer admin"}</button>
                    </form>
                    <form action={`/api/admin/users/${u.id}`} method="post" className="inline">
                      <input type="hidden" name="op" value={u.isVerified ? "unverify" : "verify"} />
                      <button className="underline">{u.isVerified ? "Quitar verificación" : "Verificar"}</button>
                    </form>
                    <form action={`/api/admin/users/${u.id}`} method="post" className="inline">
                      <input type="hidden" name="op" value={u.visible ? "hide" : "show"} />
                      <button className="underline">{u.visible ? "Ocultar" : "Mostrar"}</button>
                    </form>
                    <form action={`/api/admin/users/${u.id}`} method="post" className="inline-flex items-center gap-2">
                      <input type="hidden" name="op" value="set_password" />
                      <input
                        type="password"
                        name="password"
                        minLength={6}
                        required
                        placeholder="Nueva contraseña"
                        className="w-44 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                      />
                      <button className="underline">Cambiar contraseña</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
