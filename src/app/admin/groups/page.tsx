import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
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
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-bold">Administración de grupos de mensajes</h1>
          <p className="mt-1 text-sm opacity-75">
            Herramientas de moderación interna. Las acciones se aplican sin notificación visible para miembros ni dueño.
          </p>
        </header>

        <section className="overflow-x-auto rounded-2xl border border-border/70 p-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Grupo</th>
                <th className="py-2 pr-4">Dueño</th>
                <th className="py-2 pr-4">Miembros</th>
                <th className="py-2 pr-4">Mensajes</th>
                <th className="py-2 pr-4">Creado</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4">{group.id}</td>
                  <td className="py-2 pr-4">
                    <p className="font-semibold">{group.name}</p>
                    {group.description ? <p className="mt-1 max-w-md text-xs opacity-75">{group.description}</p> : null}
                  </td>
                  <td className="py-2 pr-4">{group.owner_username ? `@${group.owner_username}` : "Sin dueño"}</td>
                  <td className="py-2 pr-4">{Number(group.members) || 0}</td>
                  <td className="py-2 pr-4">{Number(group.messages) || 0}</td>
                  <td className="py-2 pr-4">{new Date(group.created_at).toLocaleString()}</td>
                  <td className="space-x-3 py-2 pr-4 whitespace-nowrap">
                    <a href={`/admin/groups?groupId=${group.id}`} className="underline">
                      Ver conversación
                    </a>
                    <form action={`/api/admin/groups/${group.id}`} method="post" className="inline">
                      <input type="hidden" name="op" value="delete" />
                      <button type="submit" className="underline text-rose-400">
                        Eliminar grupo
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {selectedId > 0 && (
          <section className="rounded-2xl border border-border/70 p-4">
            <h2 className="text-lg font-semibold">Conversación del grupo #{selectedId}</h2>
            {selectedMessages.length === 0 ? (
              <p className="mt-2 text-sm opacity-70">No hay mensajes para mostrar.</p>
            ) : (
              <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto pr-1">
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
          </section>
        )}
      </div>
    </div>
  );
}
