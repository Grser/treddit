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

const QUICK_EMOJIS = ["😀", "😂", "🔥", "❤️", "👏", "😮", "🙏", "🎉"];

const QUICK_MEDIA: Array<{ label: string; url: string; type: "gif" | "sticker" }> = [
  { label: "GIF hype", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzU2b2M0OW53cm9zNnN3eXF5ODNnM2ZwMjk3bWQ2bWF5bnRxd3FuNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYt5jPR6QX5pnqM/giphy.gif", type: "gif" },
  { label: "Sticker cool", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2F2dzQ4aGdhMnA2M2V5cnRrb3g4eW9vMGl5eGVvMWFzZm9oOWQwZCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oriO0OEd9QIDdllqo/giphy.gif", type: "sticker" },
];

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
  const scrollRef = useRef<HTMLUListElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<DirectMessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [replyingTo, setReplyingTo] = useState<DirectMessageEntry | null>(null);
  const latestIdRef = useRef(initialMessages[initialMessages.length - 1]?.id ?? 0);

  useEffect(() => {
    setMessages(initialMessages);
    latestIdRef.current = initialMessages[initialMessages.length - 1]?.id ?? 0;
    const container = scrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [initialMessages, recipient.id]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [recipient.id]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const shouldStickBottom = distanceToBottom < 120;
    latestIdRef.current = messages[messages.length - 1]?.id ?? 0;
    if (shouldStickBottom) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
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
    const id = setInterval(poll, 1500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [recipient.id]);

  useEffect(() => {
    const markRead = async () => {
      try {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: recipient.id }),
        });
        window.dispatchEvent(new CustomEvent("treddit:messages-read"));
      } catch {
        // noop
      }
    };
    markRead();
  }, [messages, recipient.id]);

  const canSend = useMemo(
    () => !sending && !uploading && (text.trim().length > 0 || attachments.length > 0),
    [sending, uploading, text, attachments.length],
  );

  function selectLatestMessageFromSender(message: DirectMessageEntry) {
    const latestFromSender = [...messages].reverse().find((entry) => entry.senderId === message.senderId);
    setReplyingTo(latestFromSender ?? message);
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((item) => item.url !== url));
  }

  function addEmoji(emoji: string) {
    setText((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${emoji}`);
  }

  function addQuickMedia(item: (typeof QUICK_MEDIA)[number]) {
    setAttachments((prev) => [...prev, { url: item.url, type: "image", name: item.label }]);
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
        window.dispatchEvent(new CustomEvent("treddit:messages-updated"));
        setText("");
        setAttachments([]);
        setReplyingTo(null);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 md:gap-3">
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-[#1f2c35] bg-[#0b141a] p-3 shadow-sm md:p-4">
        {messages.length === 0 && (
          <p className="text-sm opacity-70">{strings.comments.none || "Aún no hay mensajes. Inicia la conversación."}</p>
        )}
        <ul ref={scrollRef} className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {messages.map((msg, index) => {
            const isMine = msg.senderId === viewerId;
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const prevSameSender = previous?.senderId === msg.senderId;
            const nextSameSender = next?.senderId === msg.senderId;
            const showAvatar = !isMine && !nextSameSender;
            const showHeader = !isMine && !prevSameSender;
            const bubbleClasses = isMine
              ? "bg-[#005c4b] text-white"
              : "bg-[#202c33] text-[#e9edef]";
            const timeLabel = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const avatar = !isMine ? msg.sender.avatar_url?.trim() || "/demo-reddit.png" : null;
            return (
              <li key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${prevSameSender ? "mt-0.5" : "mt-2.5"}`}>
                <div className={`flex max-w-[92%] items-end gap-2 md:max-w-[82%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {!isMine && (
                    showAvatar ? (
                      <Image
                        src={avatar || "/demo-reddit.png"}
                        alt={msg.sender.nickname || msg.sender.username}
                        width={32}
                        height={32}
                        className="size-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : <div className="size-8" />
                  )}
                  <div className={`rounded-lg px-3 py-2 text-sm shadow-sm ${bubbleClasses}`}>
                    {showHeader && (
                      <p className="mb-1 flex items-center gap-2 font-semibold text-[11px] uppercase tracking-wide opacity-80">
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
                                height={220}
                                className="h-[220px] w-[320px] max-w-full object-cover"
                                unoptimized
                              />
                            ) : file.type === "video" ? (
                              <video src={file.url} controls className="h-[220px] w-[320px] max-w-full rounded-lg object-cover" />
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
                    <div className="mt-1 flex items-center justify-end gap-3">
                      <p className={`text-[11px] ${isMine ? "text-white/70" : "opacity-70"}`}>{timeLabel}</p>
                      {!nextSameSender && (
                        <button
                          type="button"
                          className={`text-xs ${isMine ? "text-white/80 hover:text-white" : "opacity-70 hover:opacity-100"}`}
                          onClick={() => selectLatestMessageFromSender(msg)}
                        >
                          Responder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <form onSubmit={sendMessage} className="shrink-0 space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-sm md:rounded-3xl md:p-4">
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
          ref={textareaRef}
          id="dm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const form = e.currentTarget.form;
              if (form) {
                form.requestSubmit();
              }
            }
          }}
          rows={1}
          className="max-h-36 w-full resize-y rounded-2xl bg-input px-4 py-3 text-sm outline-none ring-1 ring-border transition focus:ring-2 focus:ring-brand/40"
          placeholder={strings.comments.replyPlaceholder || "Escribe tu mensaje"}
          disabled={sending || uploading}
        />
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="rounded-full border border-border px-2 py-1 text-sm hover:bg-muted"
              disabled={sending || uploading}
            >
              {emoji}
            </button>
          ))}
          {QUICK_MEDIA.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => addQuickMedia(item)}
              className="rounded-full border border-border px-2 py-1 text-xs hover:bg-muted"
              disabled={sending || uploading}
            >
              + {item.type}
            </button>
          ))}
        </div>
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
