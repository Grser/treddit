import Navbar from "@/components/Navbar";
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
       LIMIT 200`
  );

  const communities = rows as CommunityRow[];

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Comunidades</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Miembros</th>
                <th className="py-2 pr-4">Moderadores</th>
                <th className="py-2 pr-4">Visible</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((community) => (
                <tr key={community.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{community.id}</td>
                  <td className="py-2 pr-4">
                    <div className="font-semibold">{community.name}</div>
                    <div className="text-xs opacity-70">/c/{community.slug}</div>
                    {community.description && (
                      <p className="mt-1 max-w-md text-xs opacity-80">{community.description}</p>
                    )}
                  </td>
                  <td className="py-2 pr-4">{community.members}</td>
                  <td className="py-2 pr-4">{community.moderators}</td>
                  <td className="py-2 pr-4">{community.visible ? "Sí" : "No"}</td>
                  <td className="py-2 pr-4 space-x-3">
                    <a href={`/c/${community.slug}`} className="underline">
                      Ver
                    </a>
                    <form
                      action={`/api/admin/communities/${community.id}`}
                      method="post"
                      className="inline"
                    >
                      <input type="hidden" name="op" value={community.visible ? "hide" : "show"} />
                      <button className="underline" type="submit">
                        {community.visible ? "Ocultar" : "Mostrar"}
                      </button>
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
