import type { RowDataPacket } from "mysql2";

import Image from "next/image";
import { redirect } from "next/navigation";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import DirectConversation from "@/components/messages/DirectConversation";
import type { ConversationParticipant } from "@/components/messages/DirectConversation";
import InboxList from "@/components/messages/InboxList";
import MessagesRealtimeSync from "@/components/messages/MessagesRealtimeSync";
import NotesBar from "@/components/messages/NotesBar";

import { requireUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoConversation, resolveDemoUserByUsername } from "@/lib/demoStore";
import { loadInbox } from "@/lib/inbox";
import { loadActiveNotes } from "@/lib/storiesNotes";
import {
  fetchConversationMessages,
  getDirectMessageAccess,
} from "@/lib/messages";

export const dynamic = "force-dynamic";

type ConversationParams = {
  params: Promise<{ username: string }>;
};

type ConversationUser = ConversationParticipant & { allowsAnyone: boolean };

type ConversationRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
};

function ConversationLayout({
  inbox,
  participant,
  messages,
  viewerId,
  helperText,
  notes,
  me,
}: {
  inbox: Awaited<ReturnType<typeof loadInbox>>;
  participant: ConversationUser;
  messages: Awaited<ReturnType<typeof fetchConversationMessages>>;
  viewerId: number;
  helperText?: string;
  notes: Awaited<ReturnType<typeof loadActiveNotes>>;
  me: { id: number; username: string } ;
}) {
  const avatar = participant.avatar_url?.trim() || "/demo-reddit.png";
  const displayName = participant.nickname || participant.username;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
        <NotesBar notes={notes} me={me} />
        <MessagesRealtimeSync />

        <div className="grid h-[calc(100dvh-7.75rem)] min-h-[560px] overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xl lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="hidden border-r border-border/80 lg:block">
            <InboxList
              entries={inbox}
              currentUserId={viewerId}
              activeUsername={participant.username}
              className="h-[calc(100dvh-18rem)] min-h-[360px] overflow-y-auto"
            />
          </aside>

          <section className="flex h-full min-h-0 flex-col">
            <header className="flex items-center gap-3 border-b border-border/80 px-4 py-3">
              <Image
                src={avatar}
                alt={displayName}
                width={52}
                height={52}
                className="size-12 rounded-full object-cover ring-1 ring-border"
                unoptimized
              />
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <span className="truncate">{displayName}</span>
                  <UserBadges size="sm" isAdmin={participant.is_admin} isVerified={participant.is_verified} />
                </p>
                <p className="text-sm opacity-70">@{participant.username}</p>
                {helperText && <p className="text-xs text-emerald-500">{helperText}</p>}
              </div>
            </header>

            <div className="min-h-0 flex-1 p-3 md:p-4">
              <DirectConversation initialMessages={messages} viewerId={viewerId} recipient={participant} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default async function ConversationPage({ params }: ConversationParams) {
  const [{ username }, me] = await Promise.all([params, requireUser()]);
  const inboxPromise = loadInbox(me.id);
  const notesPromise = loadActiveNotes(24, me.id);

  if (!isDatabaseConfigured()) {
    const demoTarget = resolveDemoUserByUsername(username);
    if (!demoTarget) {
      return (
        <div className="min-h-dvh">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-8">
            <p className="text-sm">Usuario no encontrado.</p>
          </main>
        </div>
      );
    }

    if (demoTarget.id === me.id) {
      redirect("/mensajes");
    }

    const participant: ConversationUser = {
      id: demoTarget.id,
      username: demoTarget.username,
      nickname: demoTarget.nickname,
      avatar_url: demoTarget.avatar_url,
      is_admin: demoTarget.is_admin,
      is_verified: demoTarget.is_verified,
      allowsAnyone: true,
    };

    return (
      <ConversationLayout
        inbox={await inboxPromise}
        participant={participant}
        messages={getDemoConversation(me.id, demoTarget.id)}
        viewerId={me.id}
        helperText="Modo demostración: adjunta imágenes, audio o video libremente."
        notes={await notesPromise}
        me={me}
      />
    );
  }

  const [rows] = await db.query<ConversationRow[]>(
    `SELECT id, username, nickname, avatar_url, is_admin, is_verified
     FROM Users
     WHERE username=? AND visible=1
     LIMIT 1`,
    [username],
  );
  const target = rows[0];
  if (!target) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm">Usuario no encontrado.</p>
        </main>
      </div>
    );
  }

  if (target.id === me.id) {
    redirect("/mensajes");
  }


  const access = await getDirectMessageAccess(me.id, Number(target.id));

  if (!access.canMessage) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
          <header className="flex items-center gap-3">
            <Image
              src={target.avatar_url?.trim() || "/demo-reddit.png"}
              alt={target.nickname || target.username}
              width={64}
              height={64}
              className="size-16 rounded-full object-cover ring-1 ring-border"
              unoptimized
            />
            <div>
              <p className="text-lg font-semibold flex items-center gap-2">
                {target.nickname || target.username}
                <UserBadges size="sm" isAdmin={Boolean(target.is_admin)} isVerified={Boolean(target.is_verified)} />
              </p>
              <p className="text-sm opacity-70">@{target.username}</p>
            </div>
          </header>
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-80">
            {access.allowsAnyone
              ? "Este usuario permite mensajes de terceros, pero debes seguirlo para iniciar una conversación."
              : "Necesitan seguirse mutuamente para habilitar el chat directo."}
          </div>
        </main>
      </div>
    );
  }

  const participant: ConversationUser = {
    id: Number(target.id),
    username: String(target.username),
    nickname: target.nickname ? String(target.nickname) : null,
    avatar_url: target.avatar_url ? String(target.avatar_url) : null,
    is_admin: Boolean(target.is_admin),
    is_verified: Boolean(target.is_verified),
    allowsAnyone: access.allowsAnyone,
  };

  return (
    <ConversationLayout
      inbox={await inboxPromise}
      participant={participant}
      messages={await fetchConversationMessages(me.id, participant.id, 60)}
      viewerId={me.id}
      helperText={participant.allowsAnyone ? "Acepta mensajes de cualquier usuario" : undefined}
      notes={await notesPromise}
      me={me}
    />
  );
}
