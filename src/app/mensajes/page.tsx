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
  const cookieStore = await cookies();
  const lastSeenValue = cookieStore.get("messages_last_seen")?.value;
  const lastSeen = lastSeenValue ? Number(lastSeenValue) : 0;
  const normalizedLastSeen = Number.isFinite(lastSeen) && lastSeen > 0 ? lastSeen : 0;

  const entries: InboxEntry[] = me ? await loadInbox(me.id, normalizedLastSeen) : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <header className="overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface to-brand/10 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">Bandeja</p>
          <h1 className="mt-2 text-3xl font-semibold">Mensajes</h1>
          <p className="mt-2 max-w-2xl text-sm opacity-70">
            Consulta respuestas recientes a tus publicaciones. Para hablar con alguien, abre su perfil y usa el botón de mensaje directo.
          </p>
        </header>

        {!me && (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm shadow-sm">
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
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm opacity-70 shadow-sm">
            Aún no tienes mensajes nuevos. ¡Participa en las conversaciones para recibir respuestas!
          </div>
        )}

        {me && entries.length > 0 && (
          <>
            <MarkMessagesSeen />
            <ul className="space-y-3">
              {entries.map((item) => {
                const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
                const displayName = item.nickname || item.username;
                const lastDate = getCompactTime(item.createdAt);
                const isMine = item.lastSenderId === me.id;
                const preview = item.lastMessage?.trim() || "Archivo adjunto";
                const unread = item.unreadCount > 0;
                return (
                  <li key={item.userId} className="rounded-2xl border border-border/80 bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                    <Link
                      href={`/mensajes/${item.username}`}
                      className="flex items-center gap-3 p-4"
                    >
                      <Image
                        src={avatar}
                        alt={displayName}
                        width={56}
                        height={56}
                        className="size-14 rounded-full object-cover ring-2 ring-background"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold line-clamp-1">{displayName}</span>
                          <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                          <span className="opacity-60">@{item.username}</span>
                          <span className="ml-auto rounded-full bg-muted px-2 py-1 text-xs opacity-70">{lastDate}</span>
                          {unread && (
                            <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
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

function getCompactTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ahora";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "ahora";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;
  return date.toLocaleDateString();
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
