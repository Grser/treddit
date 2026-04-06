import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import Navbar from "@/components/Navbar";
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

type SearchCommunity = {
  id: number;
  slug: string;
  name: string;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const sanitized = likeEscape(query);
  const like = `%${sanitized}%`;

  const normalizedUserQuery = normalizeUserSearchQuery(query);
  const [posts, users, communities] = await Promise.all([
    query ? findPosts(like, query) : Promise.resolve([] as SearchPost[]),
    normalizedUserQuery ? findUsers(normalizedUserQuery) : Promise.resolve([] as SearchUser[]),
    query ? findCommunities(query) : Promise.resolve([] as SearchCommunity[]),
  ]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <section className="sticky top-16 z-10 rounded-2xl border border-border bg-surface/95 p-4 backdrop-blur">
          <form action="/buscar" className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-60">⌕</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar en Treddit"
              className="h-12 w-full rounded-full border border-border bg-input pl-11 pr-4 text-sm outline-none ring-1 ring-transparent transition focus:border-brand/40 focus:ring-brand/30"
            />
          </form>
          <div className="mt-3 flex gap-2 text-sm">
            <span className="rounded-full bg-brand/15 px-3 py-1 font-semibold text-brand">Todo</span>
            <span className="rounded-full border border-border px-3 py-1 opacity-75">Posts</span>
            <span className="rounded-full border border-border px-3 py-1 opacity-75">Personas</span>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_18rem]">
          <section className="space-y-3">
            {query && posts.length === 0 && users.length === 0 && communities.length === 0 && (
              <p className="rounded-xl border border-border bg-surface p-4 text-sm opacity-70">Sin resultados para “{query}”.</p>
            )}

            {posts.map((post) => (
              <article key={post.id} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">
                  <Link href={`/u/${post.username}`} className="hover:underline">{post.nickname || post.username}</Link>
                  <span className="opacity-60"> @{post.username}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm opacity-90">{highlight(post.description || "", query)}</p>
                <Link href={`/p/${post.id}`} className="mt-2 inline-block text-xs text-brand hover:underline">Ver post</Link>
              </article>
            ))}
          </section>


            {communities.length > 0 && (
              <section className="rounded-xl border border-border bg-surface p-4">
                <h2 className="font-semibold">Comunidades</h2>
                <ul className="mt-2 space-y-2">
                  {communities.map((community) => (
                    <li key={community.id}>
                      <Link href={`/c/${community.slug}`} className="text-sm font-medium hover:underline">
                        c/{highlight(community.slug, query)}
                      </Link>
                      <p className="text-xs opacity-70">{highlight(community.name, query)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          <aside className="space-y-3">
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="font-semibold">Personas</h2>
              <ul className="mt-3 space-y-3">
                {users.slice(0, 8).map((user) => {
                  const avatar = user.avatar_url?.trim() || "/demo-reddit.png";
                  return (
                    <li key={user.id} className="flex items-center gap-3">
                      <Image src={avatar} alt={user.nickname || user.username} width={36} height={36} className="size-9 rounded-full object-cover" unoptimized />
                      <div className="min-w-0">
                        <Link href={`/u/${user.username}`} className="block truncate text-sm font-medium hover:underline">{highlight(user.nickname || user.username, query)}</Link>
                        <p className="truncate text-xs opacity-70">@{highlight(user.username, query)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function normalizeUserSearchQuery(query: string) { return query.trim().replace(/^@+/, ""); }
function likeEscape(term: string) { return term.replace(/[\\_%]/g, (char) => `\\${char}`); }

async function findPosts(like: string, term: string): Promise<SearchPost[]> {
  if (!isDatabaseConfigured()) {
    const normalized = term.toLowerCase();
    return getDemoFeed({ limit: 40 }).items
      .filter((post) => `${post.description ?? ""} ${post.username}`.toLowerCase().includes(normalized))
      .map((post) => ({ id: post.id, description: post.description ?? null, created_at: post.created_at, username: post.username, nickname: post.nickname ?? null }));
  }
  const [rows] = await db.query(`SELECT p.id, p.description, p.created_at, u.username, u.nickname FROM Posts p JOIN Users u ON u.id = p.user WHERE (p.description LIKE ? OR u.username LIKE ?) ORDER BY p.created_at DESC LIMIT 30`, [like, like]);
  return rows as SearchPost[];
}

async function findUsers(term: string): Promise<SearchUser[]> {
  if (!isDatabaseConfigured()) {
    const normalized = normalizeUserSearchQuery(term).toLowerCase();
    return getDemoRecommendedUsers(null)
      .filter((user) => `${user.username} ${user.nickname ?? ""}`.toLowerCase().includes(normalized))
      .map((user) => ({ id: user.id, username: user.username, nickname: user.nickname, avatar_url: user.avatar_url }));
  }
  const normalizedLike = `%${likeEscape(normalizeUserSearchQuery(term))}%`;
  const [rows] = await db.query(`SELECT u.id, u.username, u.nickname, u.avatar_url FROM Users u WHERE u.visible = 1 AND (u.username LIKE ? OR u.nickname LIKE ?) ORDER BY u.username ASC LIMIT 40`, [normalizedLike, normalizedLike]);
  return rows as SearchUser[];
}

async function findCommunities(term: string): Promise<SearchCommunity[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }
  const normalizedLike = `%${likeEscape(term.trim())}%`;
  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name
     FROM Communities c
     WHERE c.visible = 1 AND (c.slug LIKE ? OR c.name LIKE ?)
     ORDER BY c.name ASC
     LIMIT 20`,
    [normalizedLike, normalizedLike],
  );
  return rows as SearchCommunity[];
}

function highlight(text: string | null, needle: string): ReactNode {
  if (!text || !needle.trim()) return text;
  const pattern = new RegExp(`(${escapeRegExp(needle)})`, "gi");
  return text.split(pattern).map((part, index) => index % 2 === 1 ? <mark key={`${index}-${part}`} className="rounded bg-brand/20 px-1 text-inherit">{part}</mark> : <span key={`${index}-${part}`}>{part}</span>);
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
