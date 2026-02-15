import Link from "next/link";

import Navbar from "@/components/Navbar";
import InboxList from "@/components/messages/InboxList";
import MarkMessagesSeen from "@/components/messages/MarkMessagesSeen";
import NotesBar from "@/components/messages/NotesBar";

import { getSessionUser } from "@/lib/auth";
import { loadInbox } from "@/lib/inbox";

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
          <div className="space-y-4">
            <NotesBar entries={entries} />

            <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xl">
              <MarkMessagesSeen />
              <div className="grid h-[calc(100dvh-7.75rem)] min-h-[540px] lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="border-b border-border/80 lg:border-b-0 lg:border-r">
                <InboxList entries={entries} currentUserId={me.id} className="h-[calc(100dvh-18rem)] min-h-[360px] overflow-y-auto" />
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
          </div>
        )}
      </main>
    </div>
  );
}
