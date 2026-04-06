import type { RowDataPacket } from "mysql2";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPermission } from "@/lib/auth";
import { ensureAgeVerificationRequestsTable, ensureUsersAgeColumns } from "@/lib/ageVerification";
import { db } from "@/lib/db";
import { ensureUserReportsSchema } from "@/lib/userReports";

type AdminUserRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  is_admin: number;
  is_verified: number;
  is_age_verified: number;
  visible: number;
  birth_date: string | null;
  country_of_origin: string | null;
};

type AgeRequestRow = RowDataPacket & {
  request_id: number;
  user_id: number;
  username: string;
  nickname: string | null;
  birth_date: string | null;
  country_of_origin: string | null;
  id_document_url: string | null;
  requested_at: string;
};

type AdminUser = {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  isAdmin: boolean;
  isVerified: boolean;
  isAgeVerified: boolean;
  visible: boolean;
  birthDate: string | null;
  countryOfOrigin: string | null;
};

type UserReportRow = RowDataPacket & {
  id: number;
  reported_user_id: number;
  reporter_id: number;
  reason: string | null;
  status: "pending" | "reviewed";
  created_at: string;
  reported_username: string;
  reported_nickname: string | null;
  reporter_username: string;
  reporter_nickname: string | null;
};

type UserReport = {
  id: number;
  reportedUserId: number;
  reporterId: number;
  reason: string | null;
  status: "pending" | "reviewed";
  createdAt: string;
  reportedUsername: string;
  reportedNickname: string | null;
  reporterUsername: string;
  reporterNickname: string | null;
};

export default async function AdminUsers({ searchParams }: PageProps) {
  await requireAdminPermission("manage_users");
  await Promise.all([ensureUsersAgeColumns(), ensureAgeVerificationRequestsTable(), ensureUserReportsSchema()]);
  const params = searchParams ? await searchParams : {};
  const passwordUpdated = params.password === "updated";
  const passwordError = params.password === "error";

  const [rows] = await db.query<AdminUserRow[]>(
    "SELECT id, username, nickname, email, is_admin, is_verified, is_age_verified, visible, birth_date, country_of_origin, created_at FROM Users ORDER BY created_at DESC LIMIT 200",
  );
  const [ageRows] = await db.query<AgeRequestRow[]>(`
    SELECT avr.id AS request_id, avr.user_id, u.username, u.nickname, avr.birth_date, avr.country_of_origin, avr.id_document_url, avr.created_at AS requested_at
    FROM Age_Verification_Requests avr
    JOIN Users u ON u.id = avr.user_id
    ORDER BY avr.created_at DESC
    LIMIT 200
  `);
  const [reportRows] = await db.query<UserReportRow[]>(`
    SELECT
      ur.id,
      ur.reported_user_id,
      ur.reporter_id,
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
    LIMIT 200
  `);

  const users: AdminUser[] = rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    email: String(row.email),
    isAdmin: Boolean(row.is_admin),
    isVerified: Boolean(row.is_verified),
    isAgeVerified: Boolean(row.is_age_verified),
    visible: Boolean(row.visible),
    birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : null,
    countryOfOrigin: row.country_of_origin ? String(row.country_of_origin) : null,
  }));
  const reports: UserReport[] = reportRows.map((row) => ({
    id: Number(row.id),
    reportedUserId: Number(row.reported_user_id),
    reporterId: Number(row.reporter_id),
    reason: row.reason ? String(row.reason) : null,
    status: row.status === "reviewed" ? "reviewed" : "pending",
    createdAt: String(row.created_at),
    reportedUsername: String(row.reported_username),
    reportedNickname: row.reported_nickname ? String(row.reported_nickname) : null,
    reporterUsername: String(row.reporter_username),
    reporterNickname: row.reporter_nickname ? String(row.reporter_nickname) : null,
  }));

  return (
    <div>
      <Navbar />
      <AdminShell
        title="Administración de usuarios"
        subtitle="Panel simplificado para revisar verificaciones y gestionar cuentas sin tener todo amontonado."
      >
        <AdminSection title="Solicitudes de verificación de edad" description="Aprueba o rechaza solicitudes pendientes.">
          {ageRows.length === 0 ? (
            <p className="text-sm opacity-70">No hay solicitudes pendientes.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {ageRows.map((request) => (
                <article key={request.request_id} className="rounded-xl border border-border/70 p-4">
                  <p className="font-semibold">@{request.username}</p>
                  {request.nickname ? <p className="text-xs opacity-70">{request.nickname}</p> : null}
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="opacity-70">Nacimiento</dt><dd>{request.birth_date ? String(request.birth_date).slice(0, 10) : "Sin fecha"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="opacity-70">País</dt><dd>{request.country_of_origin || "Sin país"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="opacity-70">Solicitada</dt><dd>{new Date(request.requested_at).toLocaleString()}</dd></div>
                  </dl>
                  {request.id_document_url ? (
                    <a href={request.id_document_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm underline">
                      Ver documento
                    </a>
                  ) : (
                    <p className="mt-3 text-xs opacity-60">Sin documento adjunto.</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <form action={`/api/admin/users/${request.user_id}`} method="post">
                      <input type="hidden" name="op" value="approve_age_verification" />
                      <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Aprobar</button>
                    </form>
                    <form action={`/api/admin/users/${request.user_id}`} method="post">
                      <input type="hidden" name="op" value="reject_age_verification" />
                      <button className="rounded-full border border-border px-3 py-1.5 text-xs font-medium">Rechazar</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Usuarios" description="Acciones rápidas por cuenta y contraseña desde una vista más clara.">
          {passwordUpdated && <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Contraseña actualizada correctamente.</p>}
          {passwordError && <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">No se pudo actualizar la contraseña. Debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.</p>}
          <div className="space-y-3">
            {users.map((u) => (
              <article key={u.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">@{u.username}</p>
                    {u.nickname ? <p className="text-xs opacity-70">{u.nickname}</p> : null}
                    <p className="mt-1 text-sm opacity-80">{u.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <span className="rounded-full border border-border px-2 py-1">ID: {u.id}</span>
                    <span className="rounded-full border border-border px-2 py-1">Edad: {u.isAgeVerified ? "Verificada" : "Pendiente"}</span>
                    <span className="rounded-full border border-border px-2 py-1">País: {u.countryOfOrigin || "N/D"}</span>
                    <span className="rounded-full border border-border px-2 py-1">Visible: {u.visible ? "Sí" : "No"}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={`/api/admin/users/${u.id}`} method="post"><input type="hidden" name="op" value={u.isAdmin ? "revoke_admin" : "make_admin"} /><button className="rounded-full border border-border px-3 py-1.5 text-xs">{u.isAdmin ? "Quitar admin" : "Hacer admin"}</button></form>
                  <form action={`/api/admin/users/${u.id}`} method="post"><input type="hidden" name="op" value={u.isVerified ? "unverify" : "verify"} /><button className="rounded-full border border-border px-3 py-1.5 text-xs">{u.isVerified ? "Quitar verificación" : "Verificar"}</button></form>
                  <form action={`/api/admin/users/${u.id}`} method="post"><input type="hidden" name="op" value={u.visible ? "hide" : "show"} /><button className="rounded-full border border-border px-3 py-1.5 text-xs">{u.visible ? "Ocultar" : "Mostrar"}</button></form>
                </div>

                <form action={`/api/admin/users/${u.id}`} method="post" className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="op" value="set_password" />
                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    required
                    placeholder="Nueva contraseña"
                    className="h-9 w-52 rounded-lg border border-border bg-input px-3 text-sm"
                  />
                  <button className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white">Cambiar contraseña</button>
                  <span className="text-xs opacity-70">8+ caracteres, mayúscula, minúscula, número y símbolo.</span>
                </form>
              </article>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Reportes de cuentas" description={`Mostrando ${reports.length} reportes recientes enviados por la comunidad.`}>
          {reports.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm opacity-70">Aún no hay reportes de cuentas.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id} className="rounded-xl border border-border/70 bg-surface p-4">
                  <p className="text-sm">
                    <span className="font-semibold">{report.reporterNickname || report.reporterUsername}</span>{" "}
                    <span className="opacity-70">(@{report.reporterUsername})</span>{" "}
                    reportó a{" "}
                    <span className="font-semibold">{report.reportedNickname || report.reportedUsername}</span>{" "}
                    <span className="opacity-70">(@{report.reportedUsername})</span>.
                  </p>
                  <p className="mt-1 text-xs opacity-65">{new Date(report.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs opacity-65">Estado: {report.status === "reviewed" ? "Revisado" : "Pendiente"}</p>
                  {report.reason && <p className="mt-2 text-sm">Motivo: {report.reason}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`/u/${report.reportedUsername}`} className="rounded-full border border-border px-3 py-1 text-xs">
                      Ver perfil reportado
                    </a>
                    <a href={`/u/${report.reporterUsername}`} className="rounded-full border border-border px-3 py-1 text-xs">
                      Ver perfil reportante
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
