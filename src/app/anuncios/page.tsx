import Navbar from "@/components/Navbar";

import { db, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

type Campaign = {
  id: number;
  created_at: string;
  description: string | null;
  username: string;
  nickname: string | null;
};

export default async function AdsPage() {
  const databaseReady = isDatabaseConfigured();
  const campaigns = databaseReady ? await loadCampaigns() : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-surface to-brand/10 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">Ads Studio</p>
        <header className="mt-2 space-y-2">
          <h1 className="text-2xl font-semibold">Centro de anuncios</h1>
          <p className="text-sm opacity-70">
            Descubre campañas promocionadas por la comunidad y aprende cómo promocionar tu contenido en Treddit.
          </p>
        </header>
        </div>

        {campaigns.length > 0 ? (
          <ul className="space-y-4">
            {campaigns.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
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
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
            {databaseReady
              ? "No hay campañas promocionadas en este momento. Sé el primero en destacar tu comunidad."
              : "Configura la base de datos para empezar a mostrar campañas promocionadas."}
          </div>
        )}

        <section className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <h2 className="text-xl font-semibold">Promociona tu comunidad</h2>
          <p className="text-sm opacity-80">
            Envía un correo a <a href="mailto:ads@treddit.com" className="text-blue-400 hover:underline">ads@treddit.com</a> con los detalles de tu campaña.
            Nuestro equipo revisará la propuesta y te ayudará a lanzarla.
          </p>
          <p className="text-sm opacity-80">
            También puedes etiquetar tus publicaciones con <span className="font-semibold text-brand">#ad</span> o <span className="font-semibold text-brand">#promocionado</span> para que aparezcan aquí.
          </p>
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
    `
  );

  return rows as Campaign[];
}
