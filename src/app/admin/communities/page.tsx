import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type CommunityRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  visible: number;
  created_at: string;
  members: number;
  moderators: number;
};

export default async function AdminCommunitiesPage() {
  await requireAdmin();

  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name, c.description, c.visible, c.created_at,
            COUNT(cm.user_id) AS members,
            SUM(CASE WHEN cm.role <> 'member' THEN 1 ELSE 0 END) AS moderators
       FROM Communities c
       LEFT JOIN Community_Members cm ON cm.community_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 200`,
  );

  const communities = rows as CommunityRow[];

  return (
    <div>
      <Navbar />
      <AdminShell title="Administración de comunidades" subtitle="Vista por tarjetas para facilitar moderación y acciones rápidas.">
        <AdminSection title="Comunidades" description={`Mostrando ${communities.length} comunidades recientes.`}>
          <div className="grid gap-3 md:grid-cols-2">
            {communities.map((community) => (
              <article key={community.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{community.name}</p>
                    <p className="text-xs opacity-70">/c/{community.slug}</p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-1 text-xs">ID {community.id}</span>
                </div>
                {community.description && <p className="mt-3 text-sm opacity-85">{community.description}</p>}
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-1">Miembros: {community.members}</span>
                  <span className="rounded-full border border-border px-2 py-1">Moderadores: {community.moderators}</span>
                  <span className="rounded-full border border-border px-2 py-1">Visible: {community.visible ? "Sí" : "No"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`/c/${community.slug}`} className="rounded-full border border-border px-3 py-1 text-xs">Ver</a>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value={community.visible ? "suspend" : "show"} />
                    <button className="rounded-full border border-border px-3 py-1 text-xs" type="submit">{community.visible ? "Suspender" : "Reactivar"}</button>
                  </form>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value="delete" />
                    <button className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-500" type="submit">Borrar</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </AdminSection>
      </AdminShell>
    </div>
  );
}
