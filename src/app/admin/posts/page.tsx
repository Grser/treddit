import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import UserBadges from "@/components/UserBadges";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensurePostReportsSchema } from "@/lib/postReports";

export const dynamic = "force-dynamic";

type AdminPostsProps = {
  searchParams: Promise<{ user?: string; tag?: string }>;
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

type ReportRow = RowDataPacket & {
  id: number;
  post_id: number;
  reason: string | null;
  status: "pending" | "reviewed";
  created_at: Date | string;
  reporter_username: string;
  reporter_nickname: string | null;
  author_username: string;
  author_nickname: string | null;
  post_description: string | null;
};

type AdminReport = {
  id: number;
  postId: number;
  reason: string | null;
  status: "pending" | "reviewed";
  createdAt: string;
  reporterUsername: string;
  reporterNickname: string | null;
  authorUsername: string;
  authorNickname: string | null;
  postDescription: string | null;
};

export default async function AdminPosts({ searchParams }: AdminPostsProps) {
  await requireAdmin();
  await ensurePostReportsSchema();

  const resolvedSearchParams = await searchParams;
  const username = (resolvedSearchParams.user || "").trim();
  const tagRaw = (resolvedSearchParams.tag || "").trim();
  const normalizedTag = tagRaw ? (tagRaw.startsWith("#") ? tagRaw : `#${tagRaw}`) : "";

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (username) {
    where.push("u.username LIKE ? ESCAPE '\\\\'");
    params.push(`%${escapeLike(username)}%`);
  }

  if (normalizedTag) {
    where.push("p.description LIKE ? ESCAPE '\\\\'");
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
  const [reportRows] = await db.query<ReportRow[]>(
    `
    SELECT
      pr.id,
      pr.post_id,
      pr.reason,
      pr.status,
      pr.created_at,
      reporter.username AS reporter_username,
      reporter.nickname AS reporter_nickname,
      author.username AS author_username,
      author.nickname AS author_nickname,
      p.description AS post_description
    FROM Post_Reports pr
    JOIN Users reporter ON reporter.id = pr.reporter_id
    JOIN Posts p ON p.id = pr.post_id
    JOIN Users author ON author.id = p.user
    ORDER BY pr.created_at DESC
    LIMIT 150
    `,
    [],
  ).catch(() => [[] as ReportRow[]]);
  const reports: AdminReport[] = reportRows.map((row) => ({
    id: Number(row.id),
    postId: Number(row.post_id),
    reason: row.reason ? String(row.reason) : null,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    reporterUsername: String(row.reporter_username),
    reporterNickname: row.reporter_nickname ? String(row.reporter_nickname) : null,
    authorUsername: String(row.author_username),
    authorNickname: row.author_nickname ? String(row.author_nickname) : null,
    postDescription: row.post_description ? String(row.post_description) : null,
  }));

  return (
    <div>
      <Navbar />
      <AdminShell title="Moderación de posts" subtitle="Busca por usuario o hashtag y actúa rápido sobre publicaciones. ">
        <AdminSection title="Filtros" description="Combina filtros para ubicar contenido puntual sin perder contexto.">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" method="get" action="/admin/posts">
            <label className="flex flex-col text-sm">
              <span className="font-medium">Usuario</span>
              <input type="text" name="user" defaultValue={username} className="mt-1 h-9 rounded-lg border border-border bg-input px-3 text-sm" placeholder="usuario" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="font-medium">Hashtag</span>
              <input type="text" name="tag" defaultValue={tagRaw} className="mt-1 h-9 rounded-lg border border-border bg-input px-3 text-sm" placeholder="#tema" />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="h-9 rounded-full bg-brand px-4 text-sm font-medium text-white">Filtrar</button>
              {(username || tagRaw) && <a href="/admin/posts" className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm">Limpiar</a>}
            </div>
          </form>
        </AdminSection>

        <AdminSection title="Resultados" description={`Mostrando ${posts.length} posts recientes.`}>
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border border-border/70 bg-surface p-4">
                <p className="mb-1 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    @{p.username}
                    <UserBadges size="sm" isAdmin={p.isAdmin} isVerified={p.isVerified} />
                  </span>
                  <span className="opacity-60"> · {new Date(p.createdAt).toLocaleString()}</span>
                </p>
                <p className="mb-3 text-sm whitespace-pre-wrap">{p.description}</p>
                <form action={`/api/posts/${p.id}`} method="post" className="inline">
                  <input type="hidden" name="_method" value="DELETE" />
                  <button formAction={`/api/posts/${p.id}`} className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-500">
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </AdminSection>

        <AdminSection title="Reportes de posts" description={`Mostrando ${reports.length} reportes recientes enviados por la comunidad.`}>
          {reports.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm opacity-70">Aún no hay reportes.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id} className="rounded-xl border border-border/70 bg-surface p-4">
                  <p className="text-sm">
                    <span className="font-semibold">
                      {report.reporterNickname || report.reporterUsername}
                    </span>{" "}
                    <span className="opacity-70">(@{report.reporterUsername})</span>{" "}
                    reportó un post de{" "}
                    <span className="font-semibold">
                      {report.authorNickname || report.authorUsername}
                    </span>{" "}
                    <span className="opacity-70">(@{report.authorUsername})</span>.
                  </p>
                  <p className="mt-1 text-xs opacity-65">{new Date(report.createdAt).toLocaleString()}</p>
                  {report.reason && <p className="mt-2 text-sm">Motivo: {report.reason}</p>}
                  {report.postDescription && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border/60 bg-background/30 p-2 text-xs opacity-80">
                      {report.postDescription}
                    </p>
                  )}
                  <div className="mt-3">
                    <a href={`/p/${report.postId}`} className="rounded-full border border-border px-3 py-1 text-xs">
                      Ver post #{report.postId}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </AdminShell>
    </div>
  );
}

function escapeLike(term: string) {
  return term.replace(/[\\_%]/g, (char) => `\\${char}`);
}
