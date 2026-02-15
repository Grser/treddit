import Image from "next/image";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import MarkMessagesSeen from "@/components/messages/MarkMessagesSeen";

import { getSessionUser } from "@/lib/auth";
import { getCompactTime, loadInbox } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const me = await getSessionUser();
  const entries = me ? await loadInbox(me.id) : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {!me && (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm shadow-sm">
            <p>
              Necesitas iniciar sesión para revisar tu bandeja. {" "}
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

        {me && (
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xl">
            <MarkMessagesSeen />
            <div className="grid h-[calc(100dvh-7.75rem)] min-h-[540px] lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="border-b border-border/80 lg:border-b-0 lg:border-r">
                <div className="border-b border-border/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">Instagram style</p>
                  <h1 className="mt-1 text-2xl font-semibold">Mensajes</h1>
                </div>

                {entries.length === 0 ? (
                  <div className="p-4 text-sm opacity-70">
                    Aún no tienes mensajes nuevos. ¡Participa en las conversaciones para recibir respuestas!
                  </div>
                ) : (
                  <ul className="h-[calc(100dvh-14.5rem)] min-h-[420px] overflow-y-auto">
                    {entries.map((item) => {
                      const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
                      const displayName = item.nickname || item.username;
                      const lastDate = getCompactTime(item.createdAt);
                      const isMine = item.lastSenderId === me.id;
                      const preview = item.lastMessage?.trim() || "Archivo adjunto";
                      const unread = item.unreadCount > 0;

                      return (
                        <li key={item.userId}>
                          <Link
                            href={`/mensajes/${item.username}`}
                            className="flex items-center gap-3 border-b border-border/60 px-4 py-3 transition hover:bg-muted/50"
                          >
                            <Image
                              src={avatar}
                              alt={displayName}
                              width={52}
                              height={52}
                              className="size-12 rounded-full object-cover ring-1 ring-border"
                              unoptimized
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <span className="line-clamp-1 font-semibold">{displayName}</span>
                                <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                                <span className="ml-auto text-xs opacity-60">{lastDate}</span>
                              </div>
                              <p className={`line-clamp-1 text-sm ${unread ? "font-semibold" : "opacity-70"}`}>
                                {isMine ? "Tú: " : ""}
                                {preview}
                              </p>
                            </div>
                            {unread && (
                              <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">
                                {item.unreadCount > 99 ? "99+" : item.unreadCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>

              <section className="hidden h-full lg:flex lg:flex-col lg:items-center lg:justify-center lg:bg-gradient-to-b lg:from-background/40 lg:to-brand/5 lg:p-8">
                <div className="max-w-sm text-center">
                  <p className="text-xl font-semibold">Selecciona un chat</p>
                  <p className="mt-2 text-sm opacity-70">
                    Abre una conversación desde la columna izquierda para ver los mensajes cargando dentro de este panel.
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
