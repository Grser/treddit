import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { ensurePostReportsSchema } from "@/lib/postReports";
import { ensureUserReportsSchema } from "@/lib/userReports";

export const dynamic = "force-dynamic";

type UserReportRow = RowDataPacket & {
  id: number;
  reported_username: string;
  reported_nickname: string | null;
  reporter_username: string;
  reporter_nickname: string | null;
  reason: string | null;
  status: "pending" | "reviewed";
  created_at: string;
};

type PostReportRow = RowDataPacket & {
  id: number;
  post_id: number;
  author_username: string;
  author_nickname: string | null;
  reporter_username: string;
  reporter_nickname: string | null;
  reason: string | null;
  status: "pending" | "reviewed";
  created_at: string;
};

export default async function AdminReportsPage() {
  await requireAdminPermission("manage_reports");
  await Promise.all([ensureUserReportsSchema(), ensurePostReportsSchema()]);

  const [userRows] = await db.query<UserReportRow[]>(`
    SELECT
      ur.id,
      ur.reason,
      ur.status,
      ur.created_at,
      reported.username AS reported_username,
      reported.nickname AS reported_nickname,
      reporter.username AS reporter_username,
      reporter.nickname AS reporter_nickname
    FROM User_Reports ur
    JOIN Users reported ON reported.id = ur.reported_user_id
    JOIN Users reporter ON reporter.id = ur.reporter_id
    ORDER BY ur.created_at DESC
    LIMIT 80
  `);

  const [postRows] = await db.query<PostReportRow[]>(`
    SELECT
      pr.id,
      pr.post_id,
      pr.reason,
      pr.status,
      pr.created_at,
      author.username AS author_username,
      author.nickname AS author_nickname,
      reporter.username AS reporter_username,
      reporter.nickname AS reporter_nickname
    FROM Post_Reports pr
    JOIN Posts p ON p.id = pr.post_id
    JOIN Users author ON author.id = p.user
    JOIN Users reporter ON reporter.id = pr.reporter_id
    ORDER BY pr.created_at DESC
    LIMIT 80
  `);

  return (
    <div>
      <Navbar />
      <AdminShell title="Centro de reportes" subtitle="Revisa rápidamente reportes de cuentas y publicaciones en una sola vista.">
        <AdminSection title="Acciones rápidas" description="Puedes abrir el panel específico para moderar cada tipo de reporte.">
          <div className="flex flex-wrap gap-2 text-sm">
            <a href="/admin/users" className="rounded-full border border-border px-3 py-1.5">Ir a usuarios</a>
            <a href="/admin/posts" className="rounded-full border border-border px-3 py-1.5">Ir a posts</a>
          </div>
        </AdminSection>

        <AdminSection title="Reportes de cuentas" description={`Mostrando ${userRows.length} reportes recientes.`}>
          {userRows.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm opacity-70">Aún no hay reportes de cuentas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {userRows.map((report) => (
                <li key={report.id} className="rounded-xl border border-border/70 bg-surface p-4">
                  <p>
                    <span className="font-semibold">{report.reporter_nickname || report.reporter_username}</span>{" "}
                    <span className="opacity-70">(@{report.reporter_username})</span> reportó a{" "}
                    <span className="font-semibold">{report.reported_nickname || report.reported_username}</span>{" "}
                    <span className="opacity-70">(@{report.reported_username})</span>.
                  </p>
                  <p className="mt-1 text-xs opacity-65">{new Date(report.created_at).toLocaleString()} · {report.status === "reviewed" ? "Revisado" : "Pendiente"}</p>
                  {report.reason ? <p className="mt-1 text-sm">Motivo: {report.reason}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Reportes de posts" description={`Mostrando ${postRows.length} reportes recientes.`}>
          {postRows.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm opacity-70">Aún no hay reportes de publicaciones.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {postRows.map((report) => (
                <li key={report.id} className="rounded-xl border border-border/70 bg-surface p-4">
                  <p>
                    <span className="font-semibold">{report.reporter_nickname || report.reporter_username}</span>{" "}
                    <span className="opacity-70">(@{report.reporter_username})</span> reportó un post de{" "}
                    <span className="font-semibold">{report.author_nickname || report.author_username}</span>{" "}
                    <span className="opacity-70">(@{report.author_username})</span>.
                  </p>
                  <p className="mt-1 text-xs opacity-65">{new Date(report.created_at).toLocaleString()} · {report.status === "reviewed" ? "Revisado" : "Pendiente"}</p>
                  {report.reason ? <p className="mt-1 text-sm">Motivo: {report.reason}</p> : null}
                  <a href={`/p/${report.post_id}`} className="mt-2 inline-block rounded-full border border-border px-3 py-1 text-xs">Ver post #{report.post_id}</a>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </AdminShell>
    </div>
  );
}
