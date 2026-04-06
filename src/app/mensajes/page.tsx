import Link from "next/link";

import Navbar from "@/components/Navbar";
import InboxList from "@/components/messages/InboxList";
import MarkMessagesSeen from "@/components/messages/MarkMessagesSeen";
import MessagesRealtimeSync from "@/components/messages/MessagesRealtimeSync";
import NotesBar from "@/components/messages/NotesBar";

import { getSessionUser } from "@/lib/auth";
import { loadInbox } from "@/lib/inbox";
import { loadActiveNotes } from "@/lib/storiesNotes";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const me = await getSessionUser();
  const [entries, notes] = me
    ? await Promise.all([loadInbox(me.id), loadActiveNotes(24, me.id)])
    : [[], []];

  return (
    <div className="min-h-dvh wa-wallpaper text-foreground">
      <Navbar session={me} />
      <main className="mx-auto w-full max-w-6xl px-0 py-3 sm:px-4 sm:py-6">
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
          <div className="space-y-3 sm:space-y-4">
            <div className="px-2 sm:px-0">
              <NotesBar notes={notes} me={me} />
            </div>

            <div className="overflow-hidden border-y shadow-2xl shadow-black/35 sm:rounded-3xl sm:border sm:backdrop-blur wa-panel">
              <MarkMessagesSeen />
              <MessagesRealtimeSync />
              <div className="grid h-[calc(100dvh-6.5rem)] min-h-[520px] sm:h-[calc(100dvh-7rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
                  <InboxList entries={entries} currentUserId={me.id} className="hide-scrollbar h-[calc(100dvh-15.5rem)] min-h-[390px] overflow-y-auto sm:h-[calc(100dvh-16rem)]" />
                </aside>

                <section className="hidden h-full lg:flex lg:flex-col lg:items-center lg:justify-center lg:bg-[#0b141a]/85 lg:p-8">
                  <div className="max-w-sm text-center">
                    <p className="text-xl font-semibold">Selecciona un chat</p>
                    <p className="mt-2 text-sm opacity-70">
                      Abre una conversación desde la columna izquierda para ver los mensajes cargando dentro de este panel.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
