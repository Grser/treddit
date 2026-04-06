import Link from "next/link";

import Navbar from "@/components/Navbar";
import GroupConversation from "@/components/messages/GroupConversation";
import InboxList from "@/components/messages/InboxList";

import { requireUser } from "@/lib/auth";
import { loadInbox } from "@/lib/inbox";
import { fetchGroupDetails, fetchGroupMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function GroupConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const groupId = Number(id);

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar session={me} />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p>Grupo inválido.</p>
        </main>
      </div>
    );
  }

  const [inbox, group, messages] = await Promise.all([
    loadInbox(me.id),
    fetchGroupDetails(me.id, groupId),
    fetchGroupMessages(me.id, groupId, 0),
  ]);

  if (!group) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar session={me} />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p>No tienes acceso a este grupo.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh wa-wallpaper text-foreground">
      <Navbar session={me} />
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col px-0 py-2 sm:px-4 sm:py-6">
        <div className="grid min-h-0 flex-1 overflow-hidden border-y shadow-2xl shadow-black/35 sm:rounded-3xl sm:border lg:grid-cols-[360px_minmax(0,1fr)] wa-panel">
          <aside className="hidden border-r border-white/10 lg:block">
            <InboxList entries={inbox} currentUserId={me.id} activeUsername={`grupo-${group.id}`} className="hide-scrollbar h-[calc(100dvh-18rem)] min-h-[360px] overflow-y-auto" />
          </aside>
          <section className="flex h-full min-h-0 flex-col">
            <div className="mb-2 border-b border-[#2a3942] bg-[#202c33] px-3 py-2 md:px-4">
              <Link href="/mensajes" className="text-sm text-brand hover:underline lg:hidden">← Volver</Link>
            </div>
            <div className="min-h-0 flex-1 px-2 pb-2 md:px-4 md:pb-4">
              <div className="mx-auto h-full w-full max-w-4xl">
                <GroupConversation groupId={group.id} viewerId={me.id} initialMessages={messages} initialGroup={group} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
