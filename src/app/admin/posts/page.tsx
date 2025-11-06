import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminPostsProps = {
  searchParams: { user?: string; tag?: string };
};

type AdminPostRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  is_admin: number;
  is_verified: number;
  description: string;
  created_at: Date | string;
};

type AdminPost = {
  id: number;
  username: string;
  nickname: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  description: string;
  createdAt: string;
};

export default async function AdminPosts({ searchParams }: AdminPostsProps) {
  await requireAdmin();

  const username = (searchParams.user || "").trim();
  const tagRaw = (searchParams.tag || "").trim();
  const normalizedTag = tagRaw ? (tagRaw.startsWith("#") ? tagRaw : `#${tagRaw}`) : "";

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (username) {
    where.push("u.username LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(username)}%`);
  }

  if (normalizedTag) {
    where.push("p.description LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(normalizedTag)}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query<AdminPostRow[]>(
    `SELECT p.id, u.username, u.nickname, u.is_admin, u.is_verified, p.description, p.created_at
     FROM Posts p
     JOIN Users u ON u.id = p.user
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT 200`,
    params,
  );
  const posts: AdminPost[] = rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    isAdmin: Boolean(row.is_admin),
    isVerified: Boolean(row.is_verified),
    description: String(row.description),
    createdAt: new Date(row.created_at).toISOString(),
  }));

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Posts</h2>
            <p className="text-sm opacity-70">Filtra por usuario o por hashtag para revisar contenido específico.</p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" method="get" action="/admin/posts">
            <label className="flex flex-col text-sm">
              <span className="font-medium">Usuario</span>
              <input
                type="text"
                name="user"
                defaultValue={username}
                className="mt-1 h-9 rounded-lg border border-border bg-input px-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand/60"
                placeholder="usuario"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="font-medium">Hashtag</span>
              <input
                type="text"
                name="tag"
                defaultValue={tagRaw}
                className="mt-1 h-9 rounded-lg border border-border bg-input px-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand/60"
                placeholder="#tema"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="h-9 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
              >
                Filtrar
              </button>
              {(username || tagRaw) && (
                <a
                  href="/admin/posts"
                  className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm"
                >
                  Limpiar
                </a>
              )}
            </div>
          </form>
        </div>
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded border border-border p-3">
              <p className="mb-1 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold">
                  @{p.username}
                  <UserBadges size="sm" isAdmin={p.isAdmin} isVerified={p.isVerified} />
                </span>
                <span className="opacity-60"> · {new Date(p.createdAt).toLocaleString()}</span>
              </p>
              <p className="mb-2 text-sm">{p.description}</p>
              <form action={`/api/posts/${p.id}`} method="post" className="inline">
                <input type="hidden" name="_method" value="DELETE" />
                <button formAction={`/api/posts/${p.id}`} className="underline">
                  Eliminar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function escapeLike(term: string) {
  return term.replace(/[\\_%]/g, (char) => `\\${char}`);
}
