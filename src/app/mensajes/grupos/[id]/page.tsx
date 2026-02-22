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
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={me} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid h-[calc(100dvh-7rem)] min-h-[560px] overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xl lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="hidden border-r border-border/80 lg:block">
            <InboxList entries={inbox} currentUserId={me.id} activeUsername={`grupo-${group.id}`} className="hide-scrollbar h-[calc(100dvh-18rem)] min-h-[360px] overflow-y-auto" />
          </aside>
          <section className="flex h-full min-h-0 flex-col">
            <div className="mb-3 px-3 pt-3 md:px-4">
              <Link href="/mensajes" className="text-sm text-brand hover:underline lg:hidden">← Volver</Link>
            </div>
            <div className="min-h-0 flex-1 px-3 pb-3 md:px-4 md:pb-4">
              <GroupConversation groupId={group.id} viewerId={me.id} initialMessages={messages} initialGroup={group} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
