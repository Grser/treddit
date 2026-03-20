import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

type Campaign = {
  id: number;
  created_at: string;
  description: string | null;
  username: string;
  nickname: string | null;
};

type AdminAdsProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function AdminAdsPage({ searchParams }: AdminAdsProps) {
  const admin = await requireAdmin();
  const databaseReady = isDatabaseConfigured();
  const campaigns = databaseReady ? await loadCampaigns() : [];
  const params = await searchParams;
  const justCreated = params.created === "1";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <AdminShell title="Panel de anuncios" subtitle="Crea campañas promocionadas y revisa actividad reciente.">
        <AdminSection title="Nueva campaña" description={`La publicación se enviará desde @${admin.username}.`}>
          {!databaseReady && (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-sm">
              Configura la base de datos para crear y administrar campañas promocionadas.
            </p>
          )}
          <form method="post" action="/api/admin/announcements" className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium">Mensaje principal</span>
              <textarea name="description" required maxLength={500} rows={4} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" placeholder="Describe la campaña y agrega los detalles importantes." disabled={!databaseReady} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Hashtags</span>
              <input type="text" name="hashtags" className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" placeholder="#ad #promocionado" disabled={!databaseReady} />
            </label>
            <button type="submit" className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-60" disabled={!databaseReady}>Publicar anuncio</button>
            {justCreated && <p className="text-sm text-emerald-500">La campaña se creó correctamente.</p>}
          </form>
        </AdminSection>

        <AdminSection title="Campañas recientes" description="Últimas publicaciones detectadas con hashtags publicitarios.">
          {campaigns.length > 0 ? (
            <ul className="space-y-3">
              {campaigns.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.nickname || item.username}</p>
                      <p className="text-xs opacity-70">@{item.username}</p>
                    </div>
                    <span className="text-xs opacity-60">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  {item.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
              {databaseReady ? "Todavía no hay campañas publicadas desde el panel." : "Configura la base de datos para comenzar a mostrar anuncios."}
            </p>
          )}
        </AdminSection>
      </AdminShell>
    </div>
  );
}

async function loadCampaigns(): Promise<Campaign[]> {
  if (!isDatabaseConfigured()) return [];
  const [rows] = await db.query(
    `
    SELECT p.id, p.created_at, p.description, u.username, u.nickname
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE p.description LIKE '%#ad%' OR p.description LIKE '%#promocionado%' OR p.description LIKE '%#sponsored%'
    ORDER BY p.created_at DESC
    LIMIT 40
    `,
    [],
  );

  return rows as Campaign[];
}
