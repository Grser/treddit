import type { RowDataPacket } from "mysql2";

import { redirect } from "next/navigation";

import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import DirectConversation from "@/components/messages/DirectConversation";
import type { ConversationParticipant } from "@/components/messages/DirectConversation";

import { requireUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import {
  canSendDirectMessage,
  ensureMessageTables,
  fetchConversationMessages,
  getAllowMessagesFromAnyone,
} from "@/lib/messages";

export const dynamic = "force-dynamic";

type ConversationParams = {
  params: { username: string };
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

export default async function ConversationPage({ params }: ConversationParams) {
  const me = await requireUser();
  const slug = params.username;

  const [rows] = await db.query<ConversationRow[]>(
    `SELECT id, username, nickname, avatar_url, is_admin, is_verified
     FROM Users
     WHERE username=? AND visible=1
     LIMIT 1`,
    [slug],
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

  if (!isDatabaseConfigured()) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 space-y-3">
          <h1 className="text-xl font-semibold">Mensajes directos</h1>
          <p className="text-sm opacity-70">
            Para usar el chat necesitas configurar la base de datos. Una vez lista podrás enviar mensajes a otros usuarios.
          </p>
        </main>
      </div>
    );
  }

  await ensureMessageTables();

  const allowsThirdParty = await getAllowMessagesFromAnyone(Number(target.id));
  const canMessage = await canSendDirectMessage(me.id, Number(target.id));

  if (!canMessage) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
          <header className="flex items-center gap-3">
            <img
              src={target.avatar_url?.trim() || "/demo-reddit.png"}
              alt={target.nickname || target.username}
              className="size-16 rounded-full object-cover ring-1 ring-border"
            />
            <div>
              <p className="text-lg font-semibold flex items-center gap-2">
                {target.nickname || target.username}
                <UserBadges
                  size="sm"
                  isAdmin={target.is_admin}
                  isVerified={target.is_verified}
                />
              </p>
              <p className="text-sm opacity-70">@{target.username}</p>
            </div>
          </header>
          <div className="rounded-xl border border-border bg-surface p-6 text-sm opacity-80">
            {allowsThirdParty
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
    allowsAnyone: allowsThirdParty,
  };

  const messages = await fetchConversationMessages(me.id, participant.id, 100);
  const avatar = participant.avatar_url?.trim() || "/demo-reddit.png";
  const displayName = participant.nickname || participant.username;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <img src={avatar} alt={displayName} className="size-16 rounded-full object-cover ring-1 ring-border" />
          <div className="min-w-0">
            <p className="text-lg font-semibold flex items-center gap-2">
              <span className="truncate">{displayName}</span>
              <UserBadges
                size="sm"
                isAdmin={participant.is_admin}
                isVerified={participant.is_verified}
              />
            </p>
            <p className="text-sm opacity-70">@{participant.username}</p>
            {participant.allowsAnyone && (
              <p className="text-xs text-emerald-500">Acepta mensajes de cualquier usuario</p>
            )}
          </div>
        </header>

        <DirectConversation
          initialMessages={messages}
          viewerId={me.id}
          recipient={participant}
        />
      </main>
    </div>
  );
}
