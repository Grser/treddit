import Navbar from "@/components/Navbar";
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
  searchParams: { created?: string };
};

export default async function AdminAdsPage({ searchParams }: AdminAdsProps) {
  const admin = await requireAdmin();
  const databaseReady = isDatabaseConfigured();
  const campaigns = databaseReady ? await loadCampaigns() : [];
  const justCreated = searchParams.created === "1";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Panel de anuncios</h1>
          <p className="text-sm opacity-70">
            Crea publicaciones promocionadas que aparecerán en el centro de anuncios y en las campañas destacadas de la página
            principal.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <h2 className="text-lg font-semibold">Nueva campaña</h2>
          <p className="mt-1 text-sm opacity-70">
            La publicación se enviará desde <span className="font-semibold">@{admin.username}</span>. Agrega hashtags para
            categorizarla.
          </p>
          {!databaseReady && (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-sm">
              Configura la base de datos para crear y administrar campañas promocionadas.
            </p>
          )}
          <form
            method="post"
            action="/api/admin/announcements"
            className="mt-1 space-y-4"
          >
            <label className="block text-sm">
              <span className="font-medium">Mensaje principal</span>
              <textarea
                name="description"
                required
                maxLength={500}
                rows={4}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand/60"
                placeholder="Describe la campaña y agrega los detalles importantes."
                disabled={!databaseReady}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Hashtags</span>
              <input
                type="text"
                name="hashtags"
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand/60"
                placeholder="#ad #promocionado"
                disabled={!databaseReady}
              />
              <span className="mt-1 block text-xs opacity-60">
                Se añadirán automáticamente si no incluyes ninguno.
              </span>
            </label>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-60"
              disabled={!databaseReady}
            >
              Publicar anuncio
            </button>
            {justCreated && <p className="text-sm text-emerald-500">La campaña se creó correctamente.</p>}
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Campañas recientes</h2>
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
                  {item.description && (
                    <p className="mt-2 text-sm whitespace-pre-wrap break-words">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
              {databaseReady
                ? "Todavía no hay campañas publicadas desde el panel."
                : "Configura la base de datos para comenzar a mostrar anuncios."}
            </p>
          )}
        </section>
      </main>
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
  );

  return rows as Campaign[];
}
