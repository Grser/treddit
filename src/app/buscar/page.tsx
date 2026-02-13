import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import PageHero from "@/components/PageHero";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoFeed, getDemoRecommendedUsers } from "@/lib/demoStore";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type SearchPost = {
  id: number;
  description: string | null;
  created_at: string;
  username: string;
  nickname: string | null;
};

type SearchUser = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const sanitized = likeEscape(query);
  const like = `%${sanitized}%`;

  const normalizedUserQuery = normalizeUserSearchQuery(query);
  const posts: SearchPost[] = query ? await findPosts(like, query) : [];
  const users: SearchUser[] = normalizedUserQuery ? await findUsers(normalizedUserQuery) : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <PageHero page="search" />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
        <header className="space-y-3 rounded-3xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-brand)]">
              Resultados
            </span>
            <h1 className="text-3xl font-semibold">Buscar</h1>
          </div>
          {query ? (
            <p className="text-sm leading-relaxed text-foreground opacity-80">
              Exploramos el universo de Treddit y encontramos coincidencias con
              <span className="ml-1 inline-flex items-center gap-2 rounded-full border border-[color:rgb(168_23_0_/_0.35)] bg-[color:rgb(168_23_0_/_0.12)] px-3 py-1 text-xs font-semibold text-[color:var(--color-brand)]">
                “{query}”
              </span>
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-foreground opacity-80">
              Escribe algo para comenzar a buscar y descubre nuevas conversaciones y
              personas.
            </p>
          )}
        </header>

        <section className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Publicaciones</h2>
            {posts.length > 0 && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground opacity-70">
                {posts.length} resultados
              </span>
            )}
          </div>
          {query && posts.length === 0 && (
            <p className="text-sm opacity-70">No encontramos publicaciones que coincidan.</p>
          )}
          {posts.length > 0 && (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[color:rgb(168_23_0_/_0.6)] hover:shadow-xl"
                >
                  <div
                    className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  >
                    <div className="absolute inset-y-0 right-[-40%] w-3/5 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,23,0,0.18),transparent_70%)]" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        <Link href={`/u/${post.username}`} className="hover:underline">
                          {post.nickname || post.username}
                        </Link>
                        <span className="opacity-60"> @{post.username}</span>
                      </p>
                      <p className="text-xs opacity-60">
                        <Link href={`/p/${post.id}`} className="hover:underline">
                          {new Date(post.created_at).toLocaleString()}
                        </Link>
                      </p>
                    </div>
                    <Link
                      href={`/p/${post.id}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:rgb(168_23_0_/_0.45)] bg-[color:rgb(168_23_0_/_0.12)] px-4 py-1.5 text-xs font-semibold text-[color:var(--color-brand)] transition-colors hover:bg-brand hover:text-white"
                    >
                      <span aria-hidden>🔍</span>
                      Ver post
                    </Link>
                  </div>
                  {post.description && (
                    <div className="mt-3 space-y-2">
                      <div className="h-[2px] w-12 rounded-full bg-[color:rgb(168_23_0_/_0.35)]" />
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground opacity-80">
                        {highlight(post.description, query)}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Personas</h2>
            {users.length > 0 && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground opacity-70">
                {users.length} resultados
              </span>
            )}
          </div>
          {query && users.length === 0 && (
            <p className="text-sm opacity-70">No encontramos usuarios que coincidan.</p>
          )}
          {users.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {users.map((user) => {
                const avatar = user.avatar_url?.trim() || "/demo-reddit.png";
                return (
                  <li
                    key={user.id}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[color:rgb(168_23_0_/_0.6)] hover:shadow-xl"
                  >
                    <Image
                      src={avatar}
                      alt={user.nickname || user.username}
                      width={56}
                      height={56}
                      className="size-14 rounded-2xl object-cover ring-2 ring-border transition-all duration-300 group-hover:ring-[color:rgb(168_23_0_/_0.6)]"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-wide">
                        <Link href={`/u/${user.username}`} className="hover:underline">
                          {highlight(user.nickname || user.username, query)}
                        </Link>
                      </p>
                      <p className="truncate text-xs text-foreground opacity-70">
                        @{highlight(user.username, query)}
                      </p>
                    </div>
                    <Link
                      href={`/u/${user.username}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:rgb(168_23_0_/_0.45)] bg-[color:rgb(168_23_0_/_0.12)] px-4 py-1.5 text-xs font-semibold text-[color:var(--color-brand)] transition-colors hover:bg-brand hover:text-white"
                    >
                      <span aria-hidden>✨</span>
                      Ver perfil
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}


function normalizeUserSearchQuery(query: string) {
  return query.trim().replace(/^@+/, "");
}

function likeEscape(term: string) {
  return term.replace(/[\\_%]/g, (char) => `\\${char}`);
}

async function findPosts(like: string, term: string): Promise<SearchPost[]> {
  if (!isDatabaseConfigured()) {
    const normalized = term.toLowerCase();
    return getDemoFeed({ limit: 40 }).items
      .filter((post) => {
        const haystack = `${post.description ?? ""} ${post.username}`.toLowerCase();
        return normalized ? haystack.includes(normalized) : true;
      })
      .map((post) => ({
        id: post.id,
        description: post.description ?? null,
        created_at: post.created_at,
        username: post.username,
        nickname: post.nickname ?? null,
      }));
  }
  const [rows] = await db.query(
    `
    SELECT p.id, p.description, p.created_at, u.username, u.nickname
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE (p.description LIKE ? OR u.username LIKE ?)
    ORDER BY p.created_at DESC
    LIMIT 30
    `,
    [like, like]
  );
  return rows as SearchPost[];
}

async function findUsers(term: string): Promise<SearchUser[]> {
  if (!isDatabaseConfigured()) {
    const normalized = normalizeUserSearchQuery(term).toLowerCase();
    return getDemoRecommendedUsers(null)
      .filter((user) => {
        const haystack = `${user.username} ${user.nickname ?? ""}`.toLowerCase();
        return normalized ? haystack.includes(normalized) : true;
      })
      .map((user) => ({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
      }));
  }
  const normalizedLike = `%${likeEscape(normalizeUserSearchQuery(term))}%`;
  const [rows] = await db.query(
    `
    SELECT u.id, u.username, u.nickname, u.avatar_url
    FROM Users u
    WHERE u.visible = 1 AND (u.username LIKE ? OR u.nickname LIKE ?)
    ORDER BY u.username ASC
    LIMIT 40
    `,
    [normalizedLike, normalizedLike]
  );
  return rows as SearchUser[];
}

function highlight(text: string | null, needle: string): ReactNode {
  if (!text || !needle.trim()) return text;
  const pattern = new RegExp(`(${escapeRegExp(needle)})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${index}-${part}`} className="rounded bg-brand/20 px-1 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`${index}-${part}`}>{part}</span>
    )
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
