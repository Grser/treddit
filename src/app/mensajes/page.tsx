import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import MarkMessagesSeen from "@/components/messages/MarkMessagesSeen";

import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getDemoInbox } from "@/lib/demoStore";
import { fetchConversationSummaries } from "@/lib/messages";

export const dynamic = "force-dynamic";

type InboxEntry = {
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
  lastMessage: string;
  lastSenderId: number;
  createdAt: string;
  unreadCount: number;
};

export default async function MessagesPage() {
  const me = await getSessionUser();
  const cookieStore = cookies();
  const lastSeenValue = cookieStore.get("messages_last_seen")?.value;
  const lastSeen = lastSeenValue ? Number(lastSeenValue) : 0;
  const normalizedLastSeen = Number.isFinite(lastSeen) && lastSeen > 0 ? lastSeen : 0;

  const entries: InboxEntry[] = me ? await loadInbox(me.id, normalizedLastSeen) : [];

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
          <>
            <MarkMessagesSeen />
            <ul className="space-y-4">
              {entries.map((item) => {
                const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
                const displayName = item.nickname || item.username;
                const lastDate = new Date(item.createdAt).toLocaleString();
                const isMine = item.lastSenderId === me.id;
                const preview = item.lastMessage?.trim() || "Archivo adjunto";
                const unread = item.unreadCount > 0;
                return (
                  <li key={item.userId} className="rounded-xl border border-border bg-surface">
                    <Link
                      href={`/mensajes/${item.username}`}
                      className="flex gap-3 p-4 transition hover:bg-muted/60"
                    >
                      <Image
                        src={avatar}
                        alt={displayName}
                        width={48}
                        height={48}
                        className="size-12 rounded-full object-cover ring-1 ring-border"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold line-clamp-1">{displayName}</span>
                          <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                          <span className="opacity-60">@{item.username}</span>
                          <span className="text-xs opacity-60">{lastDate}</span>
                          {unread && (
                            <span className="ml-auto inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-brand/90 px-2 text-xs font-semibold text-white">
                              {item.unreadCount > 99 ? "99+" : item.unreadCount}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm line-clamp-2 whitespace-pre-wrap break-words ${
                            unread ? "font-semibold" : "opacity-80"
                          }`}
                        >
                          {isMine ? "Tú: " : ""}
                          {preview}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

async function loadInbox(userId: number, lastSeen: number): Promise<InboxEntry[]> {
  if (!isDatabaseConfigured()) {
    return getDemoInbox(userId, lastSeen || undefined).map((entry) => ({
      userId: entry.userId,
      username: entry.username,
      nickname: entry.nickname,
      avatar_url: entry.avatar_url,
      is_admin: entry.is_admin,
      is_verified: entry.is_verified,
      lastMessage: entry.lastMessage,
      lastSenderId: entry.lastSenderId,
      createdAt: entry.created_at,
      unreadCount: entry.unreadCount,
    }));
  }

  const rows = await fetchConversationSummaries(userId, { limit: 40, lastSeen });
  return rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    is_admin: row.is_admin,
    is_verified: row.is_verified,
    lastMessage: row.lastMessage,
    lastSenderId: row.lastSenderId,
    createdAt: row.createdAt,
    unreadCount: row.unreadCount,
  }));
}
