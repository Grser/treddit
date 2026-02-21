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

const QUICK_EMOJIS = ["😀", "😂", "🔥", "❤️", "👏", "😮", "🙏", "🎉"] as const;
const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

const gifStorageKey = (userId: number) => `treddit_dm_saved_gifs_${userId}`;
const stickerStorageKey = (userId: number) => `treddit_dm_saved_stickers_${userId}`;

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
  const [messageMenuId, setMessageMenuId] = useState<number | null>(null);
  const [savedGifs, setSavedGifs] = useState<string[]>([]);
  const [savedStickers, setSavedStickers] = useState<string[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

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
    resizeTextarea();
  }, [text]);


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


  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const gifs = window.localStorage.getItem(gifStorageKey(viewerId));
      const stickers = window.localStorage.getItem(stickerStorageKey(viewerId));
      setSavedGifs(gifs ? JSON.parse(gifs) : []);
      setSavedStickers(stickers ? JSON.parse(stickers) : []);
    } catch {
      setSavedGifs([]);
      setSavedStickers([]);
    }
  }, [viewerId]);

  function persistSavedMedia(next: string[], kind: "gif" | "sticker") {
    if (typeof window === "undefined") return;
    const unique = [...new Set(next)].slice(0, 32);
    if (kind === "gif") {
      setSavedGifs(unique);
      window.localStorage.setItem(gifStorageKey(viewerId), JSON.stringify(unique));
      return;
    }
    setSavedStickers(unique);
    window.localStorage.setItem(stickerStorageKey(viewerId), JSON.stringify(unique));
  }

  function saveMedia(url: string, kind: "gif" | "sticker") {
    if (!url) return;
    const source = kind === "gif" ? savedGifs : savedStickers;
    persistSavedMedia([url, ...source], kind);
  }

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

  function resizeTextarea() {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }

  function addQuickMedia(item: (typeof QUICK_MEDIA)[number]) {
    saveMedia(item.url, item.type);
    setAttachments((prev) => [...prev, { url: item.url, type: "image", name: item.label }]);
  }

  async function handleReaction(messageId: number, emoji: string) {
    try {
      await fetch("/api/messages/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      setMessages((prev) => prev.map((item) => {
        if (item.id !== messageId) return item;
        const reactions = item.reactions || [];
        const withoutMine = reactions.filter((entry) => entry.userId !== viewerId);
        return { ...item, reactions: [...withoutMine, { emoji, userId: viewerId, username: "yo" }] };
      }));
    } catch {
      // noop
    }
    setMessageMenuId(null);
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
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-surface/90 p-3 shadow-sm md:p-4">
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
              ? "bg-brand text-white"
              : "bg-input text-foreground";
            const timeLabel = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const avatar = !isMine ? msg.sender.avatar_url?.trim() || "/demo-reddit.png" : null;
            return (
              <li key={msg.id} className={`group/message flex ${isMine ? "justify-end" : "justify-start"} ${prevSameSender ? "mt-0.5" : "mt-2.5"}`}>
                <div className={`flex max-w-[98%] items-end gap-2 md:max-w-[90%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
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
                  <div className={`relative rounded-lg px-4 py-2.5 text-sm shadow-sm ${bubbleClasses}`}>
                    <button
                      type="button"
                      onClick={() => setMessageMenuId((prev) => (prev === msg.id ? null : msg.id))}
                      className={`absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-xs transition ${isMine ? "bg-white/10 text-white/90 hover:bg-white/20" : "bg-background/80 text-foreground/80 hover:bg-muted"}`}
                      aria-label="Abrir menú"
                    >
                      ▾
                    </button>
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
                              <>
                                <Image
                                  src={file.url}
                                  alt={file.name || "Imagen adjunta"}
                                  width={320}
                                  height={220}
                                  className="h-[220px] w-[320px] max-w-full object-cover"
                                  unoptimized
                                />
                                <div className="flex justify-end bg-black/10 px-2 py-1">
                                  <button
                                    type="button"
                                    className="text-[11px] underline"
                                    onClick={() => saveMedia(file.url, file.url.toLowerCase().includes("gif") ? "gif" : "sticker")}
                                  >
                                    Guardar
                                  </button>
                                </div>
                              </>
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
                    {(msg.reactions?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries((msg.reactions || []).reduce<Record<string, number>>((acc, reaction) => {
                          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                          return acc;
                        }, {})).map(([emoji, total]) => (
                          <span key={`${msg.id}-${emoji}`} className={`w-fit rounded-full border px-2 py-0.5 text-sm shadow transition ${isMine ? "border-white/20 bg-white/10 text-white" : "border-border bg-background/80 text-foreground"}`}>
                            {emoji} {total}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={`relative mt-1 flex flex-wrap items-center gap-2 pr-8 transition-opacity ${isMine ? "justify-end" : "justify-start"} ${messageMenuId === msg.id ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}>
                      <p className={`text-[11px] ${isMine ? "text-white/70" : "opacity-70"}`}>{timeLabel}</p>
                      {!nextSameSender && (
                        <button
                          type="button"
                          className={`rounded-full px-2 py-0.5 text-xs transition ${isMine ? "text-white/85 hover:bg-white/10 hover:text-white" : "opacity-80 hover:bg-muted hover:opacity-100"}`}
                          onClick={() => selectLatestMessageFromSender(msg)}
                        >
                          Responder
                        </button>
                      )}
                      {messageMenuId === msg.id && (
                        <div className={`absolute bottom-8 z-20 w-56 max-w-[min(14rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface/95 p-2 shadow-xl backdrop-blur ${isMine ? "right-0" : "left-0"}`}>
                          <div className="mb-2 flex flex-wrap gap-1 border-b border-border pb-2">
                            {MESSAGE_REACTIONS.map((emoji) => (
                              <button key={`${msg.id}-${emoji}`} type="button" className="rounded-full border border-transparent px-2 py-1 text-base transition hover:border-border hover:bg-muted" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                            ))}
                          </div>
                          <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => selectLatestMessageFromSender(msg)}>Responder</button>
                          <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={async () => { if (msg.text) await navigator.clipboard.writeText(msg.text); setMessageMenuId(null); }}>Copiar</button>
                          <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs opacity-70">Reenviar (pronto)</button>
                        </div>
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
          <div className="flex items-start justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
            <div>
              <p className="font-semibold">Respondiendo a {replyingTo.sender.nickname || replyingTo.sender.username}</p>
              <p className="line-clamp-2 opacity-80">{replyingTo.text || "Mensaje con adjunto"}</p>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-sm opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {attachments.map((file) => (
              <div key={file.url} className="relative overflow-hidden rounded-2xl border border-border bg-background/60">
                {file.type === "image" ? (
                  <Image
                    src={file.url}
                    alt={file.name || "Vista previa de imagen"}
                    width={144}
                    height={144}
                    className="size-36 object-cover"
                    unoptimized
                  />
                ) : file.type === "video" ? (
                  <video src={file.url} className="size-36 object-cover" muted playsInline />
                ) : file.type === "audio" ? (
                  <div className="flex h-20 w-48 items-center px-3 text-xs">🎧 {file.name || "Audio"}</div>
                ) : (
                  <div className="flex h-20 w-48 items-center px-3 text-xs">📎 {file.name || file.url}</div>
                )}
                <button
                  type="button"
                  className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/65 text-sm text-white hover:bg-black"
                  onClick={() => removeAttachment(file.url)}
                  aria-label="Eliminar adjunto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {isTrayOpen && (
          <div className="space-y-2 rounded-2xl border border-border bg-background/70 p-2">
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_MEDIA.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => addQuickMedia(item)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                  disabled={sending || uploading}
                >
                  + {item.type}
                </button>
              ))}
              {savedStickers.slice(0, 4).map((url) => (
                <button key={`stk-${url}`} type="button" onClick={() => setAttachments((prev) => [...prev, { url, type: "image", name: "Sticker guardado" }])} className="rounded-full border border-border px-2 py-1 text-[11px] hover:bg-muted">sticker</button>
              ))}
              {savedGifs.slice(0, 4).map((url) => (
                <button key={`gif-${url}`} type="button" onClick={() => setAttachments((prev) => [...prev, { url, type: "image", name: "GIF guardado" }])} className="rounded-full border border-border px-2 py-1 text-[11px] hover:bg-muted">gif</button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={handleFileChange} />
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full bg-input text-lg transition hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              aria-label="Adjuntar"
            >
              {uploading ? "…" : "+"}
            </button>
          </div>
          <div className="flex flex-1 items-end gap-2 rounded-[26px] bg-input px-3 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-white/20">
            <textarea
              ref={textareaRef}
              id="dm-textarea"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                resizeTextarea();
              }}
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
              className="max-h-28 min-h-6 flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none"
              placeholder={strings.comments.replyPlaceholder || "Escribe tu mensaje"}
              disabled={sending || uploading}
            />
            <button
              type="button"
              onClick={() => setIsTrayOpen((prev) => !prev)}
              className="pb-1 text-xl opacity-80 transition hover:opacity-100"
              aria-label="Abrir emojis y stickers"
            >
              🙂
            </button>
          </div>
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex size-11 items-center justify-center rounded-full bg-foreground text-base font-medium text-background shadow-sm transition hover:opacity-90 disabled:opacity-60"
            aria-label={canSend ? strings.comments.send : "Audio"}
          >
            {canSend ? "➤" : "🎤"}
          </button>
        </div>
      </form>
    </div>
  );
}
