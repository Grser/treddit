"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import UserBadges from "@/components/UserBadges";
import { useLocale } from "@/contexts/LocaleContext";

import type { DirectMessageAttachment, DirectMessageEntry } from "@/lib/messages";

export type ConversationParticipant = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

function mergeById(current: DirectMessageEntry[], incoming: DirectMessageEntry[]) {
  const map = new Map<number, DirectMessageEntry>();
  [...current, ...incoming].forEach((item) => map.set(item.id, item));
  return [...map.values()].sort((a, b) => a.id - b.id);
}

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
  const [attachments, setAttachments] = useState<DirectMessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [replyingTo, setReplyingTo] = useState<DirectMessageEntry | null>(null);
  const latestIdRef = useRef(initialMessages[initialMessages.length - 1]?.id ?? 0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    latestIdRef.current = messages[messages.length - 1]?.id ?? 0;
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const latestId = latestIdRef.current;
      try {
        const res = await fetch(`/api/messages?recipientId=${recipient.id}&afterId=${latestId}&limit=40`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(payload.messages)) return;
        if (!mounted || payload.messages.length === 0) return;
        setMessages((prev) => mergeById(prev, payload.messages as DirectMessageEntry[]));
      } catch {
        // silent polling failure
      }
    };
    const id = setInterval(poll, 2200);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [recipient.id]);

  const canSend = useMemo(
    () => !sending && !uploading && (text.trim().length > 0 || attachments.length > 0),
    [sending, uploading, text, attachments.length],
  );

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((item) => item.url !== url));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) {
        throw new Error(strings.composer.errors.uploadFailed || "No se pudo adjuntar el archivo");
      }
      const mime = file.type || "";
      const type: DirectMessageAttachment["type"] = mime.startsWith("image/")
        ? "image"
        : mime.startsWith("video/")
          ? "video"
          : mime.startsWith("audio/")
            ? "audio"
            : "file";
      setAttachments((prev) => [
        ...prev,
        {
          url: payload.url as string,
          type,
          name: file.name,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : strings.composer.errors.uploadFailed;
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if ((trimmed.length === 0 && attachments.length === 0) || sending || uploading) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipient.id,
          text: trimmed,
          attachments,
          replyToMessageId: replyingTo?.id ?? null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof payload.error === "string" ? payload.error : "No se pudo enviar el mensaje";
        throw new Error(message);
      }
      if (payload.message) {
        const nextMessage = payload.message as DirectMessageEntry;
        if (!nextMessage.attachments?.length && attachments.length) {
          nextMessage.attachments = attachments;
        }
        setMessages((prev) => mergeById(prev, [nextMessage]));
        setText("");
        setAttachments([]);
        setReplyingTo(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-border/80 bg-gradient-to-b from-surface via-surface to-brand/5 p-4 shadow-sm">
        {messages.length === 0 && (
          <p className="text-sm opacity-70">{strings.comments.none || "Aún no hay mensajes. Inicia la conversación."}</p>
        )}
        <ul className="mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((msg) => {
            const isMine = msg.senderId === viewerId;
            const bubbleClasses = isMine
              ? "bg-gradient-to-br from-brand to-fuchsia-500 text-white"
              : "border border-border/80 bg-background/80 text-foreground";
            const timeLabel = new Date(msg.createdAt).toLocaleString();
            const avatar = !isMine ? msg.sender.avatar_url?.trim() || "/demo-reddit.png" : null;
            return (
              <li key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] items-end gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
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
                  <div className={`rounded-3xl px-4 py-3 text-sm shadow-sm ${bubbleClasses}`}>
                    {!isMine && (
                      <p className="mb-1 flex items-center gap-2 font-semibold text-xs uppercase tracking-wide opacity-80">
                        {msg.sender.nickname || msg.sender.username}
                        <UserBadges size="sm" isAdmin={msg.sender.is_admin} isVerified={msg.sender.is_verified} />
                      </p>
                    )}
                    {msg.replyTo && (
                      <div className={`mb-2 rounded-xl border px-3 py-2 text-xs ${isMine ? "border-white/30 bg-white/10" : "border-border bg-background/40"}`}>
                        <p className="font-semibold opacity-90">{msg.replyTo.senderNickname || msg.replyTo.senderUsername}</p>
                        <p className="line-clamp-2 opacity-80">{msg.replyTo.text || "Mensaje"}</p>
                      </div>
                    )}
                    {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                    {msg.attachments?.length ? (
                      <ul className="mt-3 space-y-2">
                        {msg.attachments.map((file) => (
                          <li key={`${msg.id}-${file.url}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                            {file.type === "image" ? (
                              <Image
                                src={file.url}
                                alt={file.name || "Imagen adjunta"}
                                width={320}
                                height={180}
                                className="h-auto w-full object-cover"
                                unoptimized
                              />
                            ) : file.type === "video" ? (
                              <video src={file.url} controls className="h-auto w-full rounded-lg" />
                            ) : file.type === "audio" ? (
                              <audio src={file.url} controls className="w-full" />
                            ) : (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate bg-black/20 px-3 py-2 text-xs underline"
                              >
                                {file.name || file.url}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className={`text-[11px] ${isMine ? "text-white/70" : "opacity-70"}`}>{timeLabel}</p>
                      <button
                        type="button"
                        className={`text-xs ${isMine ? "text-white/80 hover:text-white" : "opacity-70 hover:opacity-100"}`}
                        onClick={() => setReplyingTo(msg)}
                      >
                        Responder
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="shrink-0 space-y-3 rounded-3xl border border-border bg-surface p-4 shadow-sm">
        {replyingTo && (
          <div className="flex items-start justify-between rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs">
            <div>
              <p className="font-semibold">Respondiendo a {replyingTo.sender.nickname || replyingTo.sender.username}</p>
              <p className="line-clamp-2 opacity-80">{replyingTo.text || "Mensaje con adjunto"}</p>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-sm opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        <textarea
          id="dm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl bg-input px-4 py-3 text-sm outline-none ring-1 ring-border transition focus:ring-2 focus:ring-brand/40"
          placeholder={strings.comments.replyPlaceholder || "Escribe tu mensaje"}
          disabled={sending || uploading}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {attachments.map((file) => (
              <span key={file.url} className="inline-flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1 text-foreground">
                {file.name || file.url}
                <button
                  type="button"
                  className="text-foreground/70 hover:text-red-400"
                  onClick={() => removeAttachment(file.url)}
                  aria-label="Eliminar adjunto"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={handleFileChange} />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm transition hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
            >
              {uploading ? "Subiendo..." : "Adjuntar"}
            </button>
          </div>
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-brand to-fuchsia-500 px-5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
          >
            {strings.comments.send}
          </button>
        </div>
      </form>
    </div>
  );
}
