import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";

import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import NotificationSettingsPanel from "@/components/notifications/NotificationSettingsPanel";
import { getNotificationPreferences } from "@/lib/notifications";
import FollowRequestsPanel from "@/components/notifications/FollowRequestsPanel";
import { ensureProfilePrivacySchema } from "@/lib/profilePrivacy";

export const dynamic = "force-dynamic";

type FollowEvent = {
  id: string;
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
  id: string;
  created_at: string;
  post_id: number;
  description: string | null;
  username: string;
  nickname: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

type FollowRequestEvent = {
  id: number;
  requesterId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
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

  const databaseReady = isDatabaseConfigured();
  const preferences = me && databaseReady
    ? await getNotificationPreferences(me.id)
    : { follows: true, likes: true, reposts: true, mentions: true, ads: true, lastSeenAt: null, clearedBefore: null };

  const [follows, posts, reposts, likes, followRequests]: [FollowEvent[], PostEvent[], RepostEvent[], LikeGroupEvent[], FollowRequestEvent[]] = me && databaseReady
    ? await Promise.all([
        preferences.follows ? loadFollowers(me.id, preferences.clearedBefore) : Promise.resolve([]),
        preferences.ads ? loadFollowedPosts(me.id, preferences.clearedBefore) : Promise.resolve([]),
        preferences.reposts ? loadRepostsOnMyPosts(me.id, preferences.clearedBefore) : Promise.resolve([]),
        preferences.likes ? loadLikesOnMyPosts(me.id, preferences.clearedBefore) : Promise.resolve([]),
        loadPendingFollowRequests(me.id),
      ])
    : [[], [], [], [], []];

  const totalEvents = follows.length + posts.length + reposts.length + likes.length + followRequests.length;

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#27153f_0%,#130b22_34%,#0b0a12_100%)] text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/25 via-purple-500/20 to-blue-500/20 p-5 shadow-2xl shadow-black/25 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200/90">Activity Center</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Notificaciones</h1>
            </div>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-foreground/80">
              Última actividad en tiempo real
            </span>
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-foreground/60">Eventos</p>
              <p className="mt-1 text-2xl font-semibold leading-none">{totalEvents}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-foreground/60">Solicitudes</p>
              <p className="mt-1 text-2xl font-semibold leading-none">{followRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur sm:col-span-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-wide text-foreground/60">Me gusta</p>
              <p className="mt-1 text-2xl font-semibold leading-none">{likes.length}</p>
            </div>
          </div>
        </header>

        {!me && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm backdrop-blur">
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


        {me && !databaseReady && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm opacity-80 backdrop-blur">
            Configura la base de datos para habilitar notificaciones en tiempo real de seguidores, anuncios y actividad de tus publicaciones.
          </div>
        )}


        {me && databaseReady && (
          <NotificationSettingsPanel
            initial={{
              follows: preferences.follows,
              likes: preferences.likes,
              reposts: preferences.reposts,
              mentions: preferences.mentions,
              ads: preferences.ads,
            }}
          />
        )}

        {me && databaseReady && follows.length === 0 && posts.length === 0 && reposts.length === 0 && likes.length === 0 && followRequests.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm opacity-80 backdrop-blur">
            No hay novedades por ahora. Sigue a más personas para mantenerte al día.
          </div>
        )}

        {me && followRequests.length > 0 && <FollowRequestsPanel initialItems={followRequests} />}

        {me && follows.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Nuevos seguidores</h2>
            <ul className="space-y-3">
              {follows.map((item) => {
                const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 shadow-lg shadow-black/20 backdrop-blur">
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
                    <span className="text-xs text-foreground/60">
                      {formatRelativeTime(item.created_at)}
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
                <li key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/20 backdrop-blur">
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
                    <span className="text-xs text-foreground/60">
                      {formatRelativeTime(item.created_at)}
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
                <li key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/20 backdrop-blur">
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
                    <span className="text-xs text-foreground/60">
                      {formatRelativeTime(item.created_at)}
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
                  <li key={item.postId} className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/20 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{sentence}</span>{" "}
                          <span className="opacity-80">le dio Me gusta a tu publicación</span>
                        </p>
                        <p className="mt-1 text-xs opacity-70">{item.total} Me gusta en total</p>
                      </div>
                      <span className="text-xs text-foreground/60">{formatRelativeTime(item.createdAt)}</span>
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

async function loadFollowers(userId: number, clearedBefore: string | null): Promise<FollowEvent[]> {
  const [rows] = await db.query(
    `
    SELECT CONCAT(f.follower, '-', f.followed) AS id, f.created_at, u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified
    FROM Follows f
    JOIN Users u ON u.id = f.follower
    WHERE f.followed = ?
      AND (? IS NULL OR f.created_at >= ?)
    ORDER BY f.created_at DESC
    LIMIT 40
    `,
    [userId, clearedBefore, clearedBefore]
  );

  return rows as FollowEvent[];
}

async function loadFollowedPosts(userId: number, clearedBefore: string | null): Promise<PostEvent[]> {
  const [rows] = await db.query(
    `
    SELECT p.id, p.created_at, p.description, u.username, u.nickname, u.is_admin, u.is_verified
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE p.user IN (SELECT followed FROM Follows WHERE follower = ?)
      AND (? IS NULL OR p.created_at >= ?)
    ORDER BY p.created_at DESC
    LIMIT 40
    `,
    [userId, clearedBefore, clearedBefore]
  );

  return rows as PostEvent[];
}

async function loadRepostsOnMyPosts(userId: number, clearedBefore: string | null): Promise<RepostEvent[]> {
  const [rows] = await db.query(
    `
    SELECT CONCAT(r.user_id, '-', r.post_id) AS id, r.created_at, r.post_id, p.description,
           u.username, u.nickname, u.is_admin, u.is_verified
    FROM Reposts r
    JOIN Posts p ON p.id = r.post_id
    JOIN Users u ON u.id = r.user_id
    WHERE p.user = ? AND r.user_id <> ?
      AND (? IS NULL OR r.created_at >= ?)
    ORDER BY r.created_at DESC
    LIMIT 40
    `,
    [userId, userId, clearedBefore, clearedBefore]
  );

  return rows as RepostEvent[];
}

async function loadLikesOnMyPosts(userId: number, clearedBefore: string | null): Promise<LikeGroupEvent[]> {
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
      AND (? IS NULL OR lp.date >= ?)
    ORDER BY lp.date DESC
    LIMIT 300
    `,
    [userId, userId, clearedBefore, clearedBefore]
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


async function loadPendingFollowRequests(userId: number): Promise<FollowRequestEvent[]> {
  await ensureProfilePrivacySchema();

  const [rows] = await db.query(
    `
    SELECT fr.id, fr.requester_id AS requesterId, fr.created_at, u.username, u.nickname, u.avatar_url
    FROM Follow_Requests fr
    JOIN Users u ON u.id = fr.requester_id
    WHERE fr.target_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
    LIMIT 40
    `,
    [userId]
  );

  return rows as FollowRequestEvent[];
}

function formatRelativeTime(dateInput: string) {
  const date = new Date(dateInput);
  const diffMs = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (Math.abs(diffMs) < hour) {
    return formatter.format(Math.round(diffMs / minute), "minute");
  }
  if (Math.abs(diffMs) < day) {
    return formatter.format(Math.round(diffMs / hour), "hour");
  }
  return formatter.format(Math.round(diffMs / day), "day");
}
