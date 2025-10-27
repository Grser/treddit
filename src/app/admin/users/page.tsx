import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";

export default async function AdminUsers() {
  await requireAdmin();
  const [rows] = await db.query(
    "SELECT id, username, nickname, email, is_admin, visible, created_at FROM Users ORDER BY created_at DESC LIMIT 200"
  );
  const users = rows as any[];
  return (
    <div>
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Usuarios</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th>ID</th><th>Usuario</th><th>Email</th><th>Admin</th><th>Visible</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border/60">
                <td>{u.id}</td>
                <td>@{u.username} ({u.nickname})</td>
                <td>{u.email}</td>
                <td>{u.is_admin ? "Sí" : "No"}</td>
                <td>{u.visible ? "Sí" : "No"}</td>
                <td className="space-x-2">
                  <form action={`/api/admin/users/${u.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value={u.is_admin ? "revoke_admin" : "make_admin"} />
                    <button className="underline">{u.is_admin ? "Quitar admin" : "Hacer admin"}</button>
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
  );
}
