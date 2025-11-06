"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
        body: JSON.stringify({ recipientId: recipient.id, text: trimmed, attachments }),
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
        setMessages((prev) => [...prev, nextMessage]);
        setText("");
        setAttachments([]);
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
                    {msg.text && (
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                    {msg.attachments?.length ? (
                      <ul className="mt-3 space-y-2">
                        {msg.attachments.map((file) => (
                          <li key={`${msg.id}-${file.url}`} className="overflow-hidden rounded-lg border border-white/10">
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
                    <p className={`mt-1 text-xs ${isMine ? "text-white/70" : "opacity-70"}`}>{timeLabel}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

    <form onSubmit={sendMessage} className="space-y-3">
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
        disabled={sending || uploading}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {attachments.map((file) => (
            <span
              key={file.url}
              className="inline-flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1 text-foreground"
            >
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
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
          >
            {uploading ? "Subiendo..." : "Adjuntar"}
          </button>
        </div>
        <button
          type="submit"
          disabled={sending || uploading || (!text.trim() && attachments.length === 0)}
          className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {strings.comments.send}
        </button>
      </div>
    </form>
  </div>
);
}
