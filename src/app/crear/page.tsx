import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import CreateCommunityForm from "@/components/community/CreateCommunityForm";
import ManageCommunitiesList from "@/components/community/ManageCommunitiesList";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

type ManageableCommunityRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  role: string | null;
};

export default async function CrearPage() {
  const session = await getSessionUser();

  let manageable: { id: number; slug: string; name: string; role?: string | null }[] = [];
  if (session) {
    const [rows] = await db.query<ManageableCommunityRow[]>(
      `SELECT c.id, c.slug, c.name, cm.role
       FROM Community_Members cm
       JOIN Communities c ON c.id = cm.community_id
       WHERE cm.user_id = ? AND c.visible = 1
       ORDER BY FIELD(cm.role, 'owner','admin','moderator','member'), c.name ASC`,
      [session.id],
    );
    manageable = rows
      .filter((row) => (row.role ? row.role.toLowerCase() !== "member" : true))
      .map((row) => ({
        id: Number(row.id),
        slug: String(row.slug),
        name: String(row.name),
        role: row.role ? String(row.role) : null,
      }));
  }

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto max-w-3xl p-4 space-y-6">
        {!session ? (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h1 className="text-xl font-semibold">Inicia sesión para crear comunidades</h1>
            <p className="mt-2 text-sm opacity-80">
              Para lanzar y administrar una comunidad necesitas una cuenta. Puedes explorar el contenido sin registrarte
              desde la página principal.
            </p>
            <div className="mt-4 flex gap-2">
              <a href="/auth/login" className="h-9 rounded-full border border-border px-4 text-sm">
                Entrar
              </a>
              <a href="/auth/registrar" className="h-9 rounded-full bg-brand px-4 text-sm text-white">
                Registrarse
              </a>
            </div>
          </div>
        ) : (
          <>
            <CreateCommunityForm />
            <ManageCommunitiesList communities={manageable} />
          </>
        )}
      </div>
    </div>
  );
}
