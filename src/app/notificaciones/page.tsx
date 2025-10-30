import Navbar from "@/components/Navbar";
import PageHero from "@/components/PageHero";

export default function NotificationsPage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <PageHero page="notifications" />
    </div>
  );
}
import Link from "next/link";

import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type FollowEvent = {
  id: number;
  created_at: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

type PostEvent = {
  id: number;
  created_at: string;
  description: string | null;
  username: string;
  nickname: string | null;
};

export default async function NotificationsPage() {
  const me = await getSessionUser();

  const follows: FollowEvent[] = me ? await loadFollowers(me.id) : [];
  const posts: PostEvent[] = me ? await loadFollowedPosts(me.id) : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Notificaciones</h1>
          <p className="text-sm opacity-70">
            Aquí verás nuevos seguidores y publicaciones recientes de tus comunidades.
          </p>
        </header>

        {!me && (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm">
            <p>
              Inicia sesión para recibir notificaciones personalizadas.{" "}
              <Link href="/auth/login" className="text-blue-400 hover:underline">
                Entrar
              </Link>{" "}
              o{" "}
              <Link href="/auth/registrar" className="text-blue-400 hover:underline">
                crea una cuenta
              </Link>
              .
            </p>
          </div>
        )}

        {me && follows.length === 0 && posts.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
            No hay novedades por ahora. Sigue a más personas para mantenerte al día.
          </div>
        )}

        {me && follows.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Nuevos seguidores</h2>
            <ul className="space-y-3">
              {follows.map((item) => {
                const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <img
                      src={avatar}
                      alt={item.nickname || item.username}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        <Link href={`/u/${item.username}`} className="hover:underline">
                          {item.nickname || item.username}
                        </Link>
                      </p>
                      <p className="text-xs opacity-70">@{item.username}</p>
                    </div>
                    <span className="text-xs opacity-60">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {me && posts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Publicaciones de tu red</h2>
            <ul className="space-y-3">
              {posts.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        <Link href={`/u/${item.username}`} className="hover:underline">
                          {item.nickname || item.username}
                        </Link>
                      </p>
                      <p className="text-xs opacity-70">@{item.username}</p>
                    </div>
                    <span className="text-xs opacity-60">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-2 text-sm whitespace-pre-wrap break-words">{item.description}</p>
                  )}
                  <Link
                    href={`/p/${item.id}`}
                    className="mt-2 inline-flex text-sm text-blue-400 hover:underline"
                  >
                    Ver publicación
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

async function loadFollowers(userId: number): Promise<FollowEvent[]> {
  const [rows] = await db.query(
    `
    SELECT f.id, f.created_at, u.username, u.nickname, u.avatar_url
    FROM Follows f
    JOIN Users u ON u.id = f.follower
    WHERE f.followed = ?
    ORDER BY f.created_at DESC
    LIMIT 40
    `,
    [userId]
  );

  return rows as FollowEvent[];
}

async function loadFollowedPosts(userId: number): Promise<PostEvent[]> {
  const [rows] = await db.query(
    `
    SELECT p.id, p.created_at, p.description, u.username, u.nickname
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE p.user IN (SELECT followed FROM Follows WHERE follower = ?)
    ORDER BY p.created_at DESC
    LIMIT 40
    `,
    [userId]
  );

  return rows as PostEvent[];
}
