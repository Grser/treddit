import Navbar from "@/components/Navbar";

import { getSessionUser } from "@/lib/auth";
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
  const [session, campaigns] = await Promise.all([
    getSessionUser(),
    databaseReady ? loadCampaigns() : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={session} />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <header className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Anuncios de la comunidad</h1>
          <p className="mt-2 text-sm opacity-70">Publicaciones promocionadas etiquetadas por los usuarios.</p>
        </header>

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
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
            {databaseReady
              ? "No hay campañas promocionadas en este momento."
              : "Configura la base de datos para empezar a mostrar campañas promocionadas."}
          </div>
        )}
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
