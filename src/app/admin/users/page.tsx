import type { RowDataPacket } from "mysql2";

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

export default async function AdminUsers() {
  await requireAdmin();
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
