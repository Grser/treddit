import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type GroupRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: number;
  owner_username: string | null;
  members: number;
  messages: number;
};

type GroupMessageRow = RowDataPacket & {
  id: number;
  message: string;
  created_at: string;
  username: string;
  nickname: string | null;
};

export default async function AdminGroupsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = searchParams ? await searchParams : {};
  const selectedId = Number(params.groupId || 0);

  const [groups] = await db.query<GroupRow[]>(
    `SELECT g.id,
            g.name,
            g.description,
            g.created_at,
            g.created_by,
            owner.username AS owner_username,
            COUNT(DISTINCT gm.user_id) AS members,
            COUNT(DISTINCT msg.id) AS messages
       FROM Direct_Message_Groups g
       LEFT JOIN Users owner ON owner.id = g.created_by
       LEFT JOIN Direct_Message_Group_Members gm ON gm.group_id = g.id
       LEFT JOIN Direct_Message_Group_Messages msg ON msg.group_id = g.id
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 250`,
  );

  let selectedMessages: GroupMessageRow[] = [];
  if (Number.isFinite(selectedId) && selectedId > 0) {
    const [rows] = await db.query<GroupMessageRow[]>(
      `SELECT msg.id, msg.message, msg.created_at, u.username, u.nickname
         FROM Direct_Message_Group_Messages msg
         JOIN Users u ON u.id = msg.sender_id
        WHERE msg.group_id = ?
        ORDER BY msg.id DESC
        LIMIT 120`,
      [selectedId],
    );
    selectedMessages = rows;
  }

  return (
    <div>
      <Navbar />
      <AdminShell title="Administración de grupos" subtitle="Herramientas de moderación para grupos de mensajes con lectura de conversación.">
        <AdminSection title="Listado de grupos" description="Selecciona un grupo para revisar los mensajes más recientes.">
          <div className="space-y-3">
            {groups.map((group) => (
              <article key={group.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{group.name}</p>
                    {group.description ? <p className="mt-1 text-sm opacity-75">{group.description}</p> : null}
                    <p className="mt-1 text-xs opacity-70">Dueño: {group.owner_username ? `@${group.owner_username}` : "Sin dueño"}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full border border-border px-2 py-1">#{group.id}</span>
                    <span className="rounded-full border border-border px-2 py-1">Miembros {Number(group.members) || 0}</span>
                    <span className="rounded-full border border-border px-2 py-1">Mensajes {Number(group.messages) || 0}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={`/admin/groups?groupId=${group.id}`} className="rounded-full border border-border px-3 py-1 text-xs">Ver conversación</a>
                  <form action={`/api/admin/groups/${group.id}`} method="post" className="inline">
                    <input type="hidden" name="op" value="delete" />
                    <button type="submit" className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-500">Eliminar grupo</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </AdminSection>

        {selectedId > 0 && (
          <AdminSection title={`Conversación del grupo #${selectedId}`} description="Vista de solo lectura para auditoría interna.">
            {selectedMessages.length === 0 ? (
              <p className="text-sm opacity-70">No hay mensajes para mostrar.</p>
            ) : (
              <ul className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                {selectedMessages.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border/60 bg-surface/80 px-3 py-2 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs opacity-75">
                      <span>@{item.username}{item.nickname ? ` · ${item.nickname}` : ""}</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        )}
      </AdminShell>
    </div>
  );
}
