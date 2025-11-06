"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import UserBadges from "@/components/UserBadges";
import { useLocale } from "@/contexts/LocaleContext";

import type { DirectMessageEntry } from "@/lib/messages";

export type ConversationParticipant = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

export default function DirectConversation({
  initialMessages,
  viewerId,
  recipient,
}: {
  initialMessages: DirectMessageEntry[];
  viewerId: number;
  recipient: ConversationParticipant;
}) {
  const { strings } = useLocale();
  const [messages, setMessages] = useState<DirectMessageEntry[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: recipient.id, text: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof payload.error === "string" ? payload.error : "No se pudo enviar el mensaje";
        throw new Error(message);
      }
      if (payload.message) {
        setMessages((prev) => [...prev, payload.message as DirectMessageEntry]);
        setText("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        {messages.length === 0 && (
          <p className="text-sm opacity-70">
            {strings.comments.none || "Aún no hay mensajes. Inicia la conversación."}
          </p>
        )}
        <ul className="space-y-3">
          {messages.map((msg) => {
            const isMine = msg.senderId === viewerId;
            const bubbleClasses = isMine
              ? "bg-brand text-white"
              : "bg-muted/80 text-foreground";
            const timeLabel = new Date(msg.createdAt).toLocaleString();
            const avatar = !isMine
              ? msg.sender.avatar_url?.trim() || "/demo-reddit.png"
              : null;
            return (
              <li key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[80%] items-end gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {!isMine && (
                    <Image
                      src={avatar || "/demo-reddit.png"}
                      alt={msg.sender.nickname || msg.sender.username}
                      width={36}
                      height={36}
                      className="size-9 rounded-full object-cover ring-1 ring-border"
                      unoptimized
                    />
                  )}
                  <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${bubbleClasses}`}>
                    {!isMine && (
                      <p className="mb-1 flex items-center gap-2 font-semibold">
                        {msg.sender.nickname || msg.sender.username}
                        <UserBadges
                          size="sm"
                          isAdmin={msg.sender.is_admin}
                          isVerified={msg.sender.is_verified}
                        />
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`mt-1 text-xs ${isMine ? "text-white/70" : "opacity-70"}`}>{timeLabel}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="dm-textarea">
          {strings.comments.replyPlaceholder || "Escribe tu mensaje"}
        </label>
        <textarea
          id="dm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2"
          placeholder={strings.comments.placeholder}
          disabled={sending}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {strings.comments.send}
          </button>
        </div>
      </form>
    </div>
  );
}
