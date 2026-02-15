import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";

import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type FollowEvent = {
  id: number;
  created_at: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

type PostEvent = {
  id: number;
  created_at: string;
  description: string | null;
  username: string;
  nickname: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

type RepostEvent = {
  id: number;
  created_at: string;
  post_id: number;
  description: string | null;
  username: string;
  nickname: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

type LikeGroupEvent = {
  postId: number;
  postDescription: string | null;
  createdAt: string;
  total: number;
  users: Array<{
    id: number;
    username: string;
    nickname: string | null;
    is_admin?: boolean;
    is_verified?: boolean;
  }>;
};

export default async function NotificationsPage() {
  const me = await getSessionUser();

  const follows: FollowEvent[] = me ? await loadFollowers(me.id) : [];
  const posts: PostEvent[] = me ? await loadFollowedPosts(me.id) : [];
  const reposts: RepostEvent[] = me ? await loadRepostsOnMyPosts(me.id) : [];
  const likes: LikeGroupEvent[] = me ? await loadLikesOnMyPosts(me.id) : [];

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

        {me && follows.length === 0 && posts.length === 0 && reposts.length === 0 && likes.length === 0 && (
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
                    <Image
                      src={avatar}
                      alt={item.nickname || item.username}
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <Link href={`/u/${item.username}`} className="hover:underline">
                            {item.nickname || item.username}
                          </Link>
                          <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                        </span>
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
                        <span className="inline-flex items-center gap-2">
                          <Link href={`/u/${item.username}`} className="hover:underline">
                            {item.nickname || item.username}
                          </Link>
                          <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                        </span>
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

        {me && reposts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Reposts de tus publicaciones</h2>
            <ul className="space-y-3">
              {reposts.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <Link href={`/u/${item.username}`} className="hover:underline">
                            {item.nickname || item.username}
                          </Link>
                          <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                        </span>
                        <span className="font-normal opacity-80"> reposteó tu publicación</span>
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
                  <Link href={`/p/${item.post_id}`} className="mt-2 inline-flex text-sm text-blue-400 hover:underline">
                    Ver publicación
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {me && likes.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Me gusta en tus publicaciones</h2>
            <ul className="space-y-3">
              {likes.map((item) => {
                const names = item.users.map((user) => user.nickname || user.username);
                const firstNames = names.slice(0, 2);
                const remaining = Math.max(0, item.total - firstNames.length);
                const sentence =
                  firstNames.length === 0
                    ? `${item.total} personas`
                    : remaining > 0
                      ? `${firstNames.join(", ")} y ${remaining} más`
                      : firstNames.join(" y ");

                return (
                  <li key={item.postId} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{sentence}</span>{" "}
                          <span className="opacity-80">le dio Me gusta a tu publicación</span>
                        </p>
                        <p className="mt-1 text-xs opacity-70">{item.total} Me gusta en total</p>
                      </div>
                      <span className="text-xs opacity-60">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    {item.postDescription && (
                      <p className="mt-2 text-sm whitespace-pre-wrap break-words">{item.postDescription}</p>
                    )}
                    <Link href={`/p/${item.postId}`} className="mt-2 inline-flex text-sm text-blue-400 hover:underline">
                      Ver publicación
                    </Link>
                  </li>
                );
              })}
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
    SELECT f.id, f.created_at, u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified
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
    SELECT p.id, p.created_at, p.description, u.username, u.nickname, u.is_admin, u.is_verified
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

async function loadRepostsOnMyPosts(userId: number): Promise<RepostEvent[]> {
  const [rows] = await db.query(
    `
    SELECT r.id, r.created_at, r.post_id, p.description,
           u.username, u.nickname, u.is_admin, u.is_verified
    FROM Reposts r
    JOIN Posts p ON p.id = r.post_id
    JOIN Users u ON u.id = r.user_id
    WHERE p.user = ? AND r.user_id <> ?
    ORDER BY r.created_at DESC
    LIMIT 40
    `,
    [userId, userId]
  );

  return rows as RepostEvent[];
}

async function loadLikesOnMyPosts(userId: number): Promise<LikeGroupEvent[]> {
  type LikeRow = {
    postId: number;
    postDescription: string | null;
    createdAt: string;
    userId: number;
    username: string;
    nickname: string | null;
    is_admin?: boolean;
    is_verified?: boolean;
  };

  const [rows] = await db.query(
    `
    SELECT lp.post AS postId,
           p.description AS postDescription,
           lp.date AS createdAt,
           u.id AS userId,
           u.username,
           u.nickname,
           u.is_admin,
           u.is_verified
    FROM Like_Posts lp
    JOIN Posts p ON p.id = lp.post
    JOIN Users u ON u.id = lp.user
    WHERE p.user = ? AND lp.user <> ?
    ORDER BY lp.date DESC
    LIMIT 300
    `,
    [userId, userId]
  );

  const byPost = new Map<number, LikeGroupEvent>();
  for (const row of rows as LikeRow[]) {
    const postId = Number(row.postId);
    const found = byPost.get(postId);
    if (!found) {
      byPost.set(postId, {
        postId,
        postDescription: row.postDescription,
        createdAt: row.createdAt,
        total: 1,
        users: [
          {
            id: Number(row.userId),
            username: row.username,
            nickname: row.nickname,
            is_admin: row.is_admin,
            is_verified: row.is_verified,
          },
        ],
      });
      continue;
    }

    found.total += 1;
    if (found.users.length < 3 && !found.users.some((user) => user.id === Number(row.userId))) {
      found.users.push({
        id: Number(row.userId),
        username: row.username,
        nickname: row.nickname,
        is_admin: row.is_admin,
        is_verified: row.is_verified,
      });
    }
  }

  return Array.from(byPost.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40);
}
