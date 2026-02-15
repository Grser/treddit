import Image from "next/image";
import Link from "next/link";

import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import FollowButton from "@/components/follow/FollowButton";

import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoRecommendedUsers, resolveDemoUserByUsername } from "@/lib/demoStore";

export type FollowPageKind = "followers" | "following";

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
};

type FollowRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
  followedByViewer: number;
};

type FollowEntry = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_verified: boolean;
  followedByViewer: boolean;
};

function mapFollowRow(row: FollowRow): FollowEntry {
  return {
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    is_admin: Boolean(row.is_admin),
    is_verified: Boolean(row.is_verified),
    followedByViewer: Boolean(row.followedByViewer),
  } satisfies FollowEntry;
}

function renderEmptyState(kind: FollowPageKind): string {
  return kind === "followers"
    ? "Aún no tiene seguidores. ¡Comparte su perfil para atraer a más personas!"
    : "Aún no sigue a nadie. Explora comunidades y descubre cuentas nuevas.";
}

export default function createFollowPage(kind: FollowPageKind) {
  const title = kind === "followers" ? "Seguidores" : "Siguiendo";
  return async function FollowListPage({
    params,
  }: {
    params: Promise<{ username: string }>;
  }) {
    const { username } = await params;
    const viewer = await getSessionUser();

    if (!isDatabaseConfigured()) {
      const demoUser = resolveDemoUserByUsername(username);
      if (!demoUser) {
        return (
          <div className="min-h-dvh bg-background text-foreground">
            <Navbar />
            <main className="mx-auto max-w-3xl px-4 py-8">
              <p className="text-sm">Usuario no encontrado.</p>
            </main>
          </div>
        );
      }
      const suggestions = getDemoRecommendedUsers(demoUser.id)
        .filter((user) => user.id !== demoUser.id)
        .slice(0, 8);

      return (
        <div className="min-h-dvh bg-background text-foreground">
          <Navbar />
          <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            <header className="rounded-xl border border-border bg-surface p-5">
              <h1 className="text-xl font-semibold">{title} de {demoUser.nickname || demoUser.username}</h1>
              <p className="text-sm opacity-70">Modo demostración: mostramos cuentas sugeridas porque no hay base de datos.</p>
            </header>
            <ul className="space-y-3">
              {suggestions.map((entry) => {
                const avatar = entry.avatar_url?.trim() || "/demo-reddit.png";
                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
                    <Image
                      src={avatar}
                      alt={entry.nickname || entry.username}
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/u/${entry.username}`} className="font-semibold hover:underline">
                          {entry.nickname || entry.username}
                        </Link>
                        <UserBadges size="sm" isAdmin={entry.is_admin} isVerified={entry.is_verified} />
                        <span className="text-sm opacity-60">@{entry.username}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </main>
        </div>
      );
    }

    const [userRows] = await db.query<UserRow[]>(
      `SELECT id, username, nickname, avatar_url, is_admin, is_verified FROM Users WHERE username=? AND visible=1 LIMIT 1`,
      [username],
    );
    const userRow = userRows[0];
    if (!userRow) {
      return (
        <div className="min-h-dvh bg-background text-foreground">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-8">
            <p className="text-sm">Usuario no encontrado.</p>
          </main>
        </div>
      );
    }

    const profile = {
      id: Number(userRow.id),
      username: String(userRow.username),
      nickname: userRow.nickname ? String(userRow.nickname) : null,
      avatar_url: userRow.avatar_url ? String(userRow.avatar_url) : null,
      is_admin: Boolean(userRow.is_admin),
      is_verified: Boolean(userRow.is_verified),
    };

    const viewerIdParam = viewer?.id ?? 0;
    const relationColumn = kind === "followers" ? "f.follower" : "f.followed";
    const filterColumn = kind === "followers" ? "f.followed" : "f.follower";

    const [rows] = await db.query<FollowRow[]>(
      `
      SELECT
        u.id,
        u.username,
        u.nickname,
        u.avatar_url,
        u.is_admin,
        u.is_verified,
        EXISTS(SELECT 1 FROM Follows fx WHERE fx.follower = ? AND fx.followed = u.id) AS followedByViewer
      FROM Follows f
      JOIN Users u ON u.id = ${relationColumn}
      WHERE ${filterColumn} = ?
        AND u.visible = 1
      ORDER BY u.nickname IS NULL, u.nickname, u.username
      LIMIT 200
      `,
      [viewerIdParam, profile.id],
    );

    const entries = rows.map(mapFollowRow);
    const avatar = profile.avatar_url?.trim() || "/demo-reddit.png";
    const heading = kind === "followers" ? `Seguidores de ${profile.nickname || profile.username}` : `Cuentas que ${profile.nickname || profile.username} sigue`;

    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          <header className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <Image
              src={avatar}
              alt={profile.nickname || profile.username}
              width={56}
              height={56}
              className="size-14 rounded-full object-cover ring-1 ring-border"
              unoptimized
            />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold line-clamp-1">{heading}</h1>
              <p className="text-sm opacity-70">@{profile.username}</p>
            </div>
          </header>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
              {renderEmptyState(kind)}
            </div>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => {
                const avatarUrl = entry.avatar_url?.trim() || "/demo-reddit.png";
                const canShowButton = viewer && viewer.id !== entry.id;
                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
                    <Image
                      src={avatarUrl}
                      alt={entry.nickname || entry.username}
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/u/${entry.username}`} className="font-semibold hover:underline">
                          {entry.nickname || entry.username}
                        </Link>
                        <UserBadges size="sm" isAdmin={entry.is_admin} isVerified={entry.is_verified} />
                        <span className="text-sm opacity-60">@{entry.username}</span>
                        {kind === "followers" && profile.id === viewer?.id && (
                          <span className="text-xs rounded-full bg-brand/10 px-2 py-0.5 text-brand">Te sigue</span>
                        )}
                      </div>
                    </div>
                    {canShowButton && (
                      <FollowButton
                        userId={entry.id}
                        initiallyFollowing={entry.followedByViewer}
                        canInteract={Boolean(viewer)}
                        variant="outline"
                        size="sm"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>
    );
  };
}
