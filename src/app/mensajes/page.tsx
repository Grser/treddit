import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";

import Link from "next/link";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type InboxEntry = {
  id: number;
  text: string;
  created_at: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  postId: number;
  is_admin?: boolean;
  is_verified?: boolean;
};

export default async function MessagesPage() {
  const me = await getSessionUser();

  const entries: InboxEntry[] = me ? await loadInbox(me.id) : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Mensajes</h1>
          <p className="text-sm opacity-70">
            Consulta respuestas recientes a tus publicaciones. Para hablar con alguien, abre su perfil y usa el botón de mensaje directo.
          </p>
        </header>

        {!me && (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm">
            <p>
              Necesitas iniciar sesión para revisar tu bandeja.{" "}
              <Link href="/auth/login" className="text-blue-400 hover:underline">
                Inicia sesión
              </Link>{" "}
              o{" "}
              <Link href="/auth/registrar" className="text-blue-400 hover:underline">
                crea una cuenta
              </Link>
              .
            </p>
          </div>
        )}

        {me && entries.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-70">
            Aún no tienes mensajes nuevos. ¡Participa en las conversaciones para recibir respuestas!
          </div>
        )}

        {me && entries.length > 0 && (
          <ul className="space-y-4">
            {entries.map((item) => {
              const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
              return (
                <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex gap-3">
                    <img
                      src={avatar}
                      alt={item.nickname || item.username}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Link href={`/u/${item.username}`} className="font-semibold hover:underline">
                          {item.nickname || item.username}
                        </Link>
                        <UserBadges
                          size="sm"
                          isAdmin={item.is_admin}
                          isVerified={item.is_verified}
                        />
                        <span className="opacity-60">@{item.username}</span>
                        <span className="text-xs opacity-60">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{item.text}</p>
                      <Link
                        href={`/p/${item.postId}`}
                        className="inline-flex text-sm text-blue-400 hover:underline"
                      >
                        Ver conversación
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

async function loadInbox(userId: number): Promise<InboxEntry[]> {
  const [rows] = await db.query(
    `
    SELECT c.id, c.text, c.created_at, u.username, u.nickname, u.avatar_url, u.is_admin, u.is_verified, c.post AS postId
    FROM Comments c
    JOIN Posts p ON p.id = c.post
    JOIN Users u ON u.id = c.user
    WHERE p.user = ? AND c.user <> ?
    ORDER BY c.created_at DESC
    LIMIT 40
    `,
    [userId, userId]
  );

  return rows as InboxEntry[];
}
