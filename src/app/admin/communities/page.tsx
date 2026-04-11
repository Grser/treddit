import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPermission } from "@/lib/auth";
import { getCommunityIconMeta, COMMUNITY_ICON_OPTIONS } from "@/lib/communityIcons";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type CommunityRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  visible: number;
  is_verified: number;
  is_adult: number;
  icon_key: string | null;
  created_at: string;
  members: number;
  moderators: number;
};

export default async function AdminCommunitiesPage() {
  await requireAdminPermission("manage_communities");

  const [verifiedColumnRows] = await db.query("SHOW COLUMNS FROM Communities LIKE 'is_verified'");
  const [iconColumnRows] = await db.query("SHOW COLUMNS FROM Communities LIKE 'icon_key'");
  const [adultColumnRows] = await db.query("SHOW COLUMNS FROM Communities LIKE 'is_adult'");
  const hasVerifiedColumn = Array.isArray(verifiedColumnRows) && verifiedColumnRows.length > 0;
  const hasIconColumn = Array.isArray(iconColumnRows) && iconColumnRows.length > 0;
  const hasAdultColumn = Array.isArray(adultColumnRows) && adultColumnRows.length > 0;

  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name, c.description, c.visible, ${hasVerifiedColumn ? "c.is_verified" : "0 AS is_verified"},
            ${hasAdultColumn ? "c.is_adult" : "0 AS is_adult"},
            ${hasIconColumn ? "c.icon_key" : "NULL AS icon_key"},
            c.created_at,
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
      <AdminShell title="Administración de comunidades" subtitle="Panel de revisión visual para aprobar, verificar y moderar comunidades.">
        <AdminSection title="Revisión de comunidades" description={`Mostrando ${communities.length} comunidades recientes para moderación.`}>
          {!hasVerifiedColumn && (
            <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              Aún no existe la columna de verificación. Se creará automáticamente cuando uses “Verificar”.
            </div>
          )}
          {(!hasIconColumn || !hasAdultColumn) && (
            <div className="mb-4 rounded-xl border border-sky-400/40 bg-sky-500/10 p-3 text-xs text-sky-100">
              El verificador de comunidades creará automáticamente las columnas de icono y +18 cuando las uses por primera vez.
            </div>
          )}
          <div className="grid gap-3 xl:grid-cols-2">
            {communities.map((community) => {
              const iconMeta = getCommunityIconMeta(community.icon_key);
              return (
                <article key={community.id} className="rounded-2xl border border-border/70 bg-background/30 p-5">
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <p className="font-semibold">{community.name}</p>
                    <p className="text-xs opacity-70">/c/{community.slug}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full border border-border px-2 py-1 text-xs">ID {community.id}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${community.is_verified ? "border border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border border-border text-foreground/70"}`}>
                      {community.is_verified ? "Verificada" : "Sin verificar"}
                    </span>
                  </div>
                </div>
                {community.description && <p className="mt-3 text-sm opacity-85">{community.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-1">Miembros: {community.members}</span>
                  <span className="rounded-full border border-border px-2 py-1">Moderadores: {community.moderators}</span>
                  <span className="rounded-full border border-border px-2 py-1">Visible: {community.visible ? "Sí" : "No"}</span>
                  <span className={`rounded-full border px-2 py-1 ${community.is_adult ? "border-rose-400/40 bg-rose-500/10 text-rose-200" : "border-border"}`}>
                    +18: {community.is_adult ? "Sí" : "No"}
                  </span>
                  {iconMeta && (
                    <span className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-2 py-1 text-fuchsia-100">
                      Icono: {iconMeta.emoji} {iconMeta.label}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`/c/${community.slug}`} className="rounded-full border border-border px-3 py-1 text-xs">Ver</a>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value={community.is_verified ? "unverify" : "verify"} />
                    <button className="rounded-full border border-border px-3 py-1 text-xs" type="submit">
                      {community.is_verified ? "Quitar verificación" : "Verificar"}
                    </button>
                  </form>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value={community.visible ? "suspend" : "show"} />
                    <button className="rounded-full border border-border px-3 py-1 text-xs" type="submit">{community.visible ? "Suspender" : "Reactivar"}</button>
                  </form>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value={community.is_adult ? "unmark_adult" : "mark_adult"} />
                    <button className="rounded-full border border-border px-3 py-1 text-xs" type="submit">
                      {community.is_adult ? "Quitar +18" : "Marcar +18"}
                    </button>
                  </form>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline-flex items-center gap-2">
                    <input type="hidden" name="op" value="set_icon" />
                    <select
                      name="iconKey"
                      defaultValue={community.icon_key ?? "none"}
                      className="rounded-full border border-border bg-background px-2 py-1 text-xs"
                    >
                      {COMMUNITY_ICON_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.emoji ? `${option.emoji} ` : ""}{option.label}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-full border border-border px-3 py-1 text-xs" type="submit">Guardar icono</button>
                  </form>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value="clear_icon" />
                    <button className="rounded-full border border-border px-3 py-1 text-xs" type="submit">Quitar icono</button>
                  </form>
                  <form action={`/api/admin/communities/${community.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value="delete" />
                    <button className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-500" type="submit">Borrar</button>
                  </form>
                </div>
                </article>
              );
            })}
          </div>
        </AdminSection>
      </AdminShell>
    </div>
  );
}
