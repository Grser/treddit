import type { RowDataPacket } from "mysql2";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import { IconSearch } from "@/components/icons";
import DirectConversation from "@/components/messages/DirectConversation";
import type { ConversationParticipant } from "@/components/messages/DirectConversation";
import InboxList from "@/components/messages/InboxList";
import LocalCallControls from "@/components/messages/LocalCallControls";
import MessagesRealtimeSync from "@/components/messages/MessagesRealtimeSync";
import NotesBar from "@/components/messages/NotesBar";

import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoConversation, resolveDemoUserByUsername } from "@/lib/demoStore";
import { loadInbox } from "@/lib/inbox";
import { loadActiveNotes } from "@/lib/storiesNotes";
import {
  fetchConversationMessages,
  getDirectMessageAccess,
  hasDirectConversation,
  isConversationApprovedForSender,
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
  me: SessionUser;
}) {
  const avatar = participant.avatar_url?.trim() || "/demo-reddit.png";
  const displayName = participant.nickname || participant.username;
  const searchProfileUrl = `/buscar?q=${encodeURIComponent(participant.username)}`;

  return (
    <div className="min-h-dvh wa-wallpaper text-foreground">
      <Navbar session={me} />
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col gap-2 px-0 py-2 sm:gap-4 sm:px-4 sm:py-6">
        <div className="px-2 sm:px-0">
          <NotesBar notes={notes} me={me} />
        </div>
        <MessagesRealtimeSync />

        <div className="grid min-h-0 flex-1 overflow-hidden border-y shadow-2xl shadow-black/35 sm:rounded-3xl sm:border lg:grid-cols-[360px_minmax(0,1fr)] wa-panel">
          <aside className="hidden border-r border-white/10 lg:block">
            <InboxList
              entries={inbox}
              currentUserId={viewerId}
              activeUsername={participant.username}
              className="hide-scrollbar h-[calc(100dvh-18rem)] min-h-[360px] overflow-y-auto"
            />
          </aside>

          <section className="flex h-full min-h-0 flex-col pt-1 sm:pt-3">
            <div className="border-b border-border bg-surface px-3 py-2 sm:px-4 lg:hidden">
              <Link href="/mensajes" className="text-sm font-medium text-brand hover:underline">← Chats</Link>
            </div>
            <header className="sticky top-0 z-20 mx-2 mt-2 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-3 py-3 backdrop-blur sm:mx-3 sm:px-4">
              <Link href={`/u/${participant.username}`} className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70">
                <Image
                  src={avatar}
                  alt={displayName}
                  width={52}
                  height={52}
                  className="size-12 rounded-full object-cover ring-1 ring-border"
                  unoptimized
                />
              </Link>
              <Link href={`/u/${participant.username}`} className="min-w-0 flex-1 hover:opacity-90">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <span className="truncate">{displayName}</span>
                  <UserBadges size="sm" isAdmin={participant.is_admin} isVerified={participant.is_verified} />
                </p>
                <p className="truncate text-sm opacity-70">@{participant.username}</p>
                {helperText && <p className="text-xs text-cyan-200">{helperText}</p>}
              </Link>
              <div className="hidden items-center gap-2 sm:flex">
                <LocalCallControls />
                <Link href={searchProfileUrl} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-input px-3 py-1 text-xs hover:bg-muted">
                  <IconSearch className="size-3.5" aria-hidden />
                  Buscar
                </Link>
              </div>
            </header>

            <div className="min-h-0 flex-1 p-1.5 sm:p-3 md:p-4">
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

  const hasConversation = await hasDirectConversation(me.id, Number(target.id));
  const approvedByTarget = access.canMessage || (hasConversation && await isConversationApprovedForSender(me.id, Number(target.id)));

  if (access.isBlockedByRecipient || access.hasBlockedRecipient) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-80">
            Este chat no está disponible porque existe un bloqueo entre ustedes.
          </div>
        </main>
      </div>
    );
  }

  if (!approvedByTarget) {
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
            {hasConversation
              ? "Tu solicitud de chat está pendiente. Espera a que este usuario la apruebe en Solicitudes."
              : "Puedes enviar una solicitud inicial desde el chat, y este usuario deberá aprobarla en Solicitudes."}
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

  const messagesPromise = fetchConversationMessages(me.id, participant.id, 60);
  const [inbox, messages, notes] = await Promise.all([inboxPromise, messagesPromise, notesPromise]);

  return (
    <ConversationLayout
      inbox={inbox}
      participant={participant}
      messages={messages}
      viewerId={me.id}
      helperText={participant.allowsAnyone ? "Acepta mensajes de cualquier usuario" : hasConversation ? "Solicitud enviada" : undefined}
      notes={notes}
      me={me}
    />
  );
}
