import Navbar from "@/components/Navbar";
import PageHero from "@/components/PageHero";

export default function SearchPage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <PageHero page="search" />
    </div>
  );
}
import type { ReactNode } from "react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: { q?: string };
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
  const query = (searchParams.q || "").trim();
  const sanitized = likeEscape(query);
  const like = `%${sanitized}%`;

  const posts: SearchPost[] = query
    ? await findPosts(like)
    : [];
  const users: SearchUser[] = query
    ? await findUsers(like)
    : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Buscar</h1>
          {query ? (
            <p className="text-sm opacity-70">
              Resultados para <span className="font-medium">“{query}”</span>
            </p>
          ) : (
            <p className="text-sm opacity-70">Escribe algo para comenzar a buscar.</p>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Publicaciones</h2>
          {query && posts.length === 0 && (
            <p className="text-sm opacity-70">No encontramos publicaciones que coincidan.</p>
          )}
          {posts.length > 0 && (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-border/80"
                >
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
                      className="shrink-0 text-sm text-blue-400 hover:underline"
                    >
                      Ver post
                    </Link>
                  </div>
                  {post.description && (
                    <p className="mt-2 text-sm whitespace-pre-wrap break-words">{highlight(post.description, query)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Usuarios</h2>
          {query && users.length === 0 && (
            <p className="text-sm opacity-70">No encontramos usuarios que coincidan.</p>
          )}
          {users.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {users.map((user) => {
                const avatar = user.avatar_url?.trim() || "/demo-reddit.png";
                return (
                  <li key={user.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <img
                      src={avatar}
                      alt={user.nickname || user.username}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        <Link href={`/u/${user.username}`} className="hover:underline">
                          {highlight(user.nickname || user.username, query)}
                        </Link>
                      </p>
                      <p className="text-xs opacity-70 truncate">@{highlight(user.username, query)}</p>
                    </div>
                    <Link
                      href={`/u/${user.username}`}
                      className="shrink-0 text-sm text-blue-400 hover:underline"
                    >
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

function likeEscape(term: string) {
  return term.replace(/[\\_%]/g, (char) => `\\${char}`);
}

async function findPosts(like: string): Promise<SearchPost[]> {
  const [rows] = await db.query(
    `
    SELECT p.id, p.description, p.created_at, u.username, u.nickname
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE (p.description LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\')
    ORDER BY p.created_at DESC
    LIMIT 30
    `,
    [like, like]
  );
  return rows as SearchPost[];
}

async function findUsers(like: string): Promise<SearchUser[]> {
  const [rows] = await db.query(
    `
    SELECT u.id, u.username, u.nickname, u.avatar_url
    FROM Users u
    WHERE u.visible = 1 AND (u.username LIKE ? ESCAPE '\\' OR u.nickname LIKE ? ESCAPE '\\')
    ORDER BY u.username ASC
    LIMIT 40
    `,
    [like, like]
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
