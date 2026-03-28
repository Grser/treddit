"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import UserBadges from "@/components/UserBadges";
import UserHoverPreview from "@/components/UserHoverPreview";
import { useLocale } from "@/contexts/LocaleContext";
import { validateUploadSize } from "@/lib/upload";
import { uploadFile } from "@/lib/clientUpload";

import type { DirectMessageAttachment, DirectMessageEntry } from "@/lib/messages";

export type ConversationParticipant = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

type SharedPostPreview = {
  id: number;
  username: string;
  nickname: string;
  description: string | null;
  mediaUrl: string | null;
  isSensitive: boolean;
  canViewSensitive: boolean;
};

const QUICK_EMOJIS = ["😀", "😂", "🔥", "❤️", "👏", "😮", "🙏", "🎉"] as const;
const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

const gifStorageKey = (userId: number) => `treddit_dm_saved_gifs_${userId}`;
const stickerStorageKey = (userId: number) => `treddit_dm_saved_stickers_${userId}`;

const QUICK_MEDIA: Array<{ label: string; url: string; type: "gif" | "sticker" }> = [
  { label: "GIF hype", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzU2b2M0OW53cm9zNnN3eXF5ODNnM2ZwMjk3bWQ2bWF5bnRxd3FuNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYt5jPR6QX5pnqM/giphy.gif", type: "gif" },
  { label: "Sticker cool", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2F2dzQ4aGdhMnA2M2V5cnRrb3g4eW9vMGl5eGVvMWFzZm9oOWQwZCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oriO0OEd9QIDdllqo/giphy.gif", type: "sticker" },
];

const STICKER_PACK = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbThwajQ0YXFreXQyb3h2b2N0NWFjYnR5ZzIybDh6OHN5b2N2YWw1NCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oriO0OEd9QIDdllqo/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm1ydGVvM2hyZ3l4YWZsM2lmbnBqeHlkam95cnRwNTNqem9iaHV4dCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/Cmr1OMJ2FN0B2/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnRjcThhajk5NjN3Z2N4YXN6aG12N3NoYjJ3M2E3dDdnYjhzeW40aCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/TBddd797slSxO/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG0yNnN1cWQ5OHQyc3F3NGJ5Y2FmMm5mb2w2bDU2cWhhY2tiNGo0aCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/Yl5aO3gdVfsQ0/giphy.gif",
] as const;


async function getAudioDurationSeconds(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error("No se pudo leer la duración del audio"));
    });
    const duration = Number(audio.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("No se pudo leer la duración del audio");
    }
    return Math.round(duration);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function mergeById(current: DirectMessageEntry[], incoming: DirectMessageEntry[]) {
  const map = new Map<number, DirectMessageEntry>();
  [...current, ...incoming].forEach((item) => map.set(item.id, item));
  return [...map.values()].sort((a, b) => a.id - b.id);
}

function parseSharedPostText(text: string | null | undefined) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;

  const urlCandidate = lines[lines.length - 1];
  const match = urlCandidate.match(/\/p\/(\d+)(?:[/?#]|$)/i);
  if (!match) return null;

  const postId = Number(match[1]);
  if (!Number.isFinite(postId) || postId <= 0) return null;

  return {
    postId,
    url: urlCandidate,
    intro: lines.slice(0, -1).join(" "),
  };
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
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [replyingTo, setReplyingTo] = useState<DirectMessageEntry | null>(null);
  const latestIdRef = useRef(initialMessages[initialMessages.length - 1]?.id ?? 0);
  const [messageMenuId, setMessageMenuId] = useState<number | null>(null);
  const [savedGifs, setSavedGifs] = useState<string[]>([]);
  const [savedStickers, setSavedStickers] = useState<string[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [sharedPostPreviews, setSharedPostPreviews] = useState<Record<number, SharedPostPreview | null>>({});
  const [revealedSensitivePosts, setRevealedSensitivePosts] = useState<Record<number, boolean>>({});
  const [oneTimeImageMode, setOneTimeImageMode] = useState(false);
  const [imageModal, setImageModal] = useState<{
    src: string;
    alt: string;
    messageId: number;
    isViewOnce: boolean;
    isMine: boolean;
  } | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  useEffect(() => {
    setMessages(initialMessages);
    latestIdRef.current = initialMessages[initialMessages.length - 1]?.id ?? 0;
    shouldAutoScrollRef.current = true;
    initialScrollDoneRef.current = false;
    const container = scrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      initialScrollDoneRef.current = true;
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
    const handleScroll = () => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceToBottom < 260;
    };
    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [recipient.id]);

  useEffect(() => {
    const container = scrollRef.current;
    latestIdRef.current = messages[messages.length - 1]?.id ?? 0;
    if (!container) return;
    if (shouldAutoScrollRef.current || !initialScrollDoneRef.current) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        initialScrollDoneRef.current = true;
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
    const sharedPostIds = [...new Set(messages
      .map((message) => parseSharedPostText(message.text)?.postId)
      .filter((id): id is number => Boolean(id)))];

    const missing = sharedPostIds.filter((id) => !(id in sharedPostPreviews));
    if (!missing.length) return;

    let active = true;

    const loadSharedPosts = async () => {
      const results = await Promise.all(missing.map(async (id) => {
        try {
          const res = await fetch(`/api/posts/${id}`, { cache: "no-store" });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok || !payload.item) return [id, null] as const;
          const item = payload.item;
          return [id, {
            id,
            username: String(item.username || ""),
            nickname: String(item.nickname || item.username || "Publicación"),
            description: item.description ? String(item.description) : null,
            mediaUrl: item.mediaUrl ? String(item.mediaUrl) : null,
            isSensitive: Boolean(item.is_sensitive),
            canViewSensitive: Boolean(item.can_view_sensitive),
          }] as const;
        } catch {
          return [id, null] as const;
        }
      }));

      if (!active) return;
      setSharedPostPreviews((prev) => {
        const next = { ...prev };
        results.forEach(([id, data]) => {
          next[id] = data;
        });
        return next;
      });
    };

    loadSharedPosts();
    return () => {
      active = false;
    };
  }, [messages, sharedPostPreviews]);


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
    setAttachments((prev) => [...prev, { url: item.url, type: "image", name: item.label, viewOnce: oneTimeImageMode }]);
  }

  function addSticker(url: string, label = "Sticker") {
    saveMedia(url, "sticker");
    setAttachments((prev) => [...prev, { url, type: "image", name: label, viewOnce: oneTimeImageMode }]);
  }

  async function markViewOnceAttachmentSeen(messageId: number, attachmentUrl: string) {
    try {
      const res = await fetch("/api/messages/attachments/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, attachmentUrl }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const viewedAt = typeof payload.viewedAt === "string" ? payload.viewedAt : new Date().toISOString();
      setMessages((prev) => prev.map((message) => {
        if (message.id !== messageId) return message;
        return {
          ...message,
          attachments: (message.attachments || []).map((attachment) => {
            if (attachment.url !== attachmentUrl || !attachment.viewOnce) {
              return attachment;
            }
            return { ...attachment, viewedByRecipientAt: viewedAt };
          }),
        };
      }));
    } catch {
      // noop
    }
  }

  async function openImagePreview(file: DirectMessageAttachment, messageId: number, isMine: boolean) {
    const isViewOnce = Boolean(file.viewOnce);
    if (!file.url) return;
    if (isViewOnce && !isMine && file.viewedByRecipientAt) return;
    setImageModal({
      src: file.url,
      alt: file.name || "Imagen adjunta",
      messageId,
      isViewOnce,
      isMine,
    });
    if (isViewOnce && !isMine) {
      await markViewOnceAttachmentSeen(messageId, file.url);
    }
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

  async function handleDeleteMessage(messageId: number) {
    try {
      const res = await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) return;
      setMessages((prev) => prev.filter((item) => item.id !== messageId));
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
      const mime = file.type || "";
      const isAudio = mime.startsWith("audio/");
      const durationSeconds = isAudio ? await getAudioDurationSeconds(file) : null;

      if (isAudio && durationSeconds && durationSeconds > 60) {
        throw new Error("El audio no puede durar más de 1 minuto");
      }

      validateUploadSize(file);

      const payload = await uploadFile(file, { scope: "chat" });
      if (!payload.url) {
        throw new Error(
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : strings.composer.errors.uploadFailed || "No se pudo adjuntar el archivo",
        );
      }
      const type: DirectMessageAttachment["type"] = mime.startsWith("image/")
        ? "image"
        : mime.startsWith("video/")
          ? "video"
          : isAudio
            ? "audio"
            : "file";
      setAttachments((prev) => [
        ...prev,
        {
          url: payload.url as string,
          type,
          name: file.name,
          durationSeconds,
          viewOnce: type === "image" ? oneTimeImageMode : false,
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
      if (audioInputRef.current) {
        audioInputRef.current.value = "";
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
        shouldAutoScrollRef.current = true;
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
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(23,36,49,0.95)_0%,rgba(15,26,36,0.92)_100%)] p-3 shadow-2xl shadow-black/30 md:p-4">
        {messages.length === 0 && (
          <p className="text-sm opacity-70">{strings.comments.none || "Aún no hay mensajes. Inicia la conversación."}</p>
        )}
        <ul ref={scrollRef} className="hide-scrollbar mt-2 min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto rounded-2xl bg-[radial-gradient(circle_at_top,rgba(38,56,74,0.26),rgba(13,20,29,0.28)_45%,rgba(11,18,26,0.6))] px-2 pr-0.5 pb-6 [overflow-anchor:none] sm:pr-1 sm:pb-8">
          {messages.map((msg, index) => {
            const isMine = msg.senderId === viewerId;
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const prevSameSender = previous?.senderId === msg.senderId;
            const nextSameSender = next?.senderId === msg.senderId;
            const showAvatar = !isMine && !prevSameSender;
            const showHeader = !isMine && !prevSameSender;
            const bubbleClasses = isMine
              ? "border border-cyan-300/25 bg-[#2a5277] text-white"
              : "border border-white/10 bg-[#1c2d3d] text-foreground";
            const timeLabel = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const avatar = !isMine ? msg.sender.avatar_url?.trim() || "/demo-reddit.png" : null;
            return (
              <li key={msg.id} className={`group/message flex ${isMine ? "justify-end" : "justify-start"} ${prevSameSender ? "mt-0.5" : "mt-2.5"}`}>
                <div className={`flex max-w-[94%] items-end gap-1.5 sm:gap-2 md:max-w-[90%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {!isMine && (
                    showAvatar ? (
                      <UserHoverPreview username={msg.sender.username}>
                        <Image
                          src={avatar || "/demo-reddit.png"}
                          alt={msg.sender.nickname || msg.sender.username}
                          width={32}
                          height={32}
                          className="size-8 rounded-full object-cover"
                          unoptimized
                        />
                      </UserHoverPreview>
                    ) : <div className="size-8" />
                  )}
                  <div className={`relative min-w-0 rounded-2xl px-3 py-2 text-sm shadow-lg shadow-black/20 sm:px-4 ${bubbleClasses}`}>
                    <button
                      type="button"
                      onClick={() => setMessageMenuId((prev) => (prev === msg.id ? null : msg.id))}
                      className={`absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full text-xs transition sm:right-2 sm:top-2 ${isMine ? "bg-white/10 text-white/90 hover:bg-white/20" : "bg-background/80 text-foreground/80 hover:bg-muted"}`}
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
                    {(() => {
                      const sharedPost = parseSharedPostText(msg.text);
                      if (!sharedPost) {
                        return msg.text ? <p className="whitespace-pre-wrap break-words">{msg.text}</p> : null;
                      }

                      const preview = sharedPostPreviews[sharedPost.postId];
                      const isPostUnavailable = preview === null;
                      const isSensitiveBlocked = Boolean(preview?.isSensitive && !preview?.canViewSensitive);
                      const canRevealSensitive = Boolean(preview?.isSensitive && preview?.canViewSensitive);
                      const isSensitiveRevealed = Boolean(revealedSensitivePosts[sharedPost.postId]);
                      const shouldShowMedia = Boolean(preview?.mediaUrl) && (!preview?.isSensitive || isSensitiveRevealed);
                      return (
                        <div className="space-y-2">
                          {sharedPost.intro ? <p className="text-xs opacity-85">{sharedPost.intro}</p> : null}
                          <Link
                            href={`/p/${sharedPost.postId}`}
                            className={`block overflow-hidden rounded-2xl border shadow-sm transition hover:scale-[1.01] ${isMine ? "border-white/25 bg-white/10" : "border-border bg-background/80"}`}
                          >
                            <div className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide ${isMine ? "bg-black/20 text-white/85" : "bg-muted/70 text-foreground/75"}`}>
                              Publicación compartida
                            </div>
                            {shouldShowMedia ? (
                              <Image
                                src={preview?.mediaUrl || ""}
                                alt={preview?.description || "Post compartido"}
                                width={360}
                                height={220}
                                className="h-[200px] w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className={`flex h-[90px] w-full items-center justify-center px-3 text-center text-xs ${isMine ? "bg-white/10 text-white/85" : "bg-muted/50 text-foreground/75"}`}>
                                {isSensitiveBlocked
                                  ? "Contenido sensible bloqueado. Debes verificar tu edad para verlo."
                                  : canRevealSensitive
                                    ? "Contenido sensible. Toca “Ver contenido” para mostrarlo."
                                    : isPostUnavailable
                                      ? "Publicación no disponible, ya no existe."
                                      : "Vista previa no disponible."}
                              </div>
                            )}
                            <div className="space-y-1 px-3 py-2.5">
                              <p className="text-xs font-semibold">{preview?.nickname || "Publicación no disponible"}</p>
                              {preview?.username ? <p className={`text-xs ${isMine ? "text-white/80" : "text-foreground/75"}`}>@{preview.username}</p> : null}
                              <p className={`line-clamp-2 text-xs ${isMine ? "text-white/85" : "text-foreground/85"}`}>
                                {isSensitiveBlocked
                                  ? "Contenido sensible bloqueado. Debes verificar tu edad para verlo."
                                  : isPostUnavailable
                                    ? "Publicación no disponible, ya no existe."
                                    : preview?.description || "Mira la publicación que te compartieron."}
                              </p>
                              {canRevealSensitive ? (
                                <div className="mt-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      setRevealedSensitivePosts((prev) => ({
                                        ...prev,
                                        [sharedPost.postId]: !isSensitiveRevealed,
                                      }));
                                    }}
                                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${isMine ? "border-white/35 bg-white/15 text-white hover:bg-white/25" : "border-border bg-background/80 text-foreground hover:bg-muted"}`}
                                  >
                                    {isSensitiveRevealed ? "Ocultar imagen" : "Ver contenido"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </Link>
                        </div>
                      );
                    })()}
                    {msg.attachments?.length ? (
                      <ul className="mt-3 space-y-2">
                        {msg.attachments.map((file) => (
                          <li key={`${msg.id}-${file.url}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                            {file.type === "image" ? (
                              <>
                                {Boolean(file.viewOnce && !isMine && file.viewedByRecipientAt) ? (
                                  <div className="flex h-[220px] w-[320px] max-w-full items-center justify-center bg-black/50 px-4 text-center text-xs text-white/90">
                                    Esta imagen era de una sola vista y ya no se puede abrir.
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="relative block"
                                    onClick={() => {
                                      void openImagePreview(file, msg.id, isMine);
                                    }}
                                  >
                                    <Image
                                      src={file.url}
                                      alt={file.name || "Imagen adjunta"}
                                      width={320}
                                      height={220}
                                      className="h-[220px] w-[320px] max-w-full object-cover"
                                      unoptimized
                                    />
                                    <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
                                      {file.viewOnce ? "1 sola vista" : "Toca para ampliar"}
                                    </span>
                                  </button>
                                )}
                                <div className="flex justify-end bg-black/10 px-2 py-1">
                                  {Boolean(file.viewOnce && isMine && file.viewedByRecipientAt) ? (
                                    <span className="mr-auto text-[11px] text-white/80">Visto por la otra persona</span>
                                  ) : null}
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
                    <div className={`relative mt-1 flex flex-wrap items-center gap-2 pr-7 sm:pr-8 transition-opacity ${isMine ? "justify-end" : "justify-start"} ${messageMenuId === msg.id ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}>
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
                        <div className={`absolute bottom-8 z-20 w-52 max-w-[min(13rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface/95 p-2 shadow-xl backdrop-blur ${isMine ? "right-0" : "left-0"}`}>
                          <div className="mb-2 flex flex-wrap gap-1 border-b border-border pb-2">
                            {MESSAGE_REACTIONS.map((emoji) => (
                              <button key={`${msg.id}-${emoji}`} type="button" className="rounded-full border border-transparent px-2 py-1 text-base transition hover:border-border hover:bg-muted" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                            ))}
                          </div>
                          <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => selectLatestMessageFromSender(msg)}>Responder</button>
                          <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={async () => { if (msg.text) await navigator.clipboard.writeText(msg.text); setMessageMenuId(null); }}>Copiar</button>
                          {isMine ? (
                            <button type="button" className="mt-1 block w-full rounded px-2 py-1 text-left text-xs text-rose-300 hover:bg-rose-500/10" onClick={() => handleDeleteMessage(msg.id)}>Eliminar mensaje</button>
                          ) : null}
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

      <form onSubmit={sendMessage} className="z-10 shrink-0 space-y-3 rounded-2xl border border-white/10 bg-[#101c28]/95 p-2.5 shadow-2xl shadow-black/25 backdrop-blur sm:p-3.5 md:rounded-3xl md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {["📎 Archivo", "🎤 Nota de voz", "📍 Compartir"].map((action) => (
            <span key={action} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-foreground/75">
              {action}
            </span>
          ))}
        </div>
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
                  <div className="relative">
                    <Image
                      src={file.url}
                      alt={file.name || "Vista previa de imagen"}
                      width={144}
                      height={144}
                      className="size-36 object-cover"
                      unoptimized
                    />
                    {file.viewOnce ? (
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">1 sola vista</span>
                    ) : null}
                  </div>
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
          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0e1720]/90 p-2">
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedStickers.slice(0, 6).map((url) => (
                <button key={`stk-${url}`} type="button" onClick={() => addSticker(url, "Sticker guardado")} className="overflow-hidden rounded-xl border border-border bg-background/70 p-1 hover:bg-muted" title="Sticker guardado">
                  <Image src={url} alt="Sticker guardado" width={44} height={44} className="size-11 object-contain" unoptimized />
                </button>
              ))}
              {savedGifs.slice(0, 4).map((url) => (
                <button key={`gif-${url}`} type="button" onClick={() => setAttachments((prev) => [...prev, { url, type: "image", name: "GIF guardado", viewOnce: oneTimeImageMode }])} className="rounded-full border border-border px-2 py-1 text-[11px] hover:bg-muted">gif</button>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Stickers</p>
              <div className="flex flex-wrap gap-2">
                {STICKER_PACK.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => addSticker(url, `Sticker ${index + 1}`)}
                    className="overflow-hidden rounded-2xl border border-border bg-background/70 p-1 transition hover:scale-[1.03] hover:bg-muted"
                    disabled={sending || uploading}
                    title={`Sticker ${index + 1}`}
                  >
                    <Image src={url} alt={`Sticker ${index + 1}`} width={64} height={64} className="size-14 object-contain" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex min-w-0 items-end gap-1.5 pr-0.5 sm:gap-2 sm:pr-1">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={handleFileChange} />
            <input ref={audioInputRef} type="file" hidden accept="audio/*" onChange={handleFileChange} />
            <button
              type="button"
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition sm:px-3 ${oneTimeImageMode ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-border bg-input text-foreground hover:bg-muted"}`}
              onClick={() => setOneTimeImageMode((prev) => !prev)}
              disabled={sending || uploading}
            >
              1 vez
            </button>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full bg-input text-lg transition hover:bg-muted sm:size-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              aria-label="Adjuntar"
            >
              {uploading ? "…" : "+"}
            </button>
          </div>
          <div className="flex min-w-0 flex-1 items-end gap-1.5 rounded-[24px] bg-[#0b141c] px-2 py-2 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-cyan-200/30 sm:gap-2 sm:rounded-[26px] sm:px-3 sm:py-2.5">
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
              className="max-h-28 min-h-6 flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-foreground/45"
              placeholder={strings.comments.replyPlaceholder || "Escribe tu mensaje"}
              disabled={sending || uploading}
            />
            <button
              type="button"
              onClick={() => setIsTrayOpen((prev) => !prev)}
              className="pb-1 pr-0.5 text-lg opacity-80 transition hover:opacity-100 sm:text-xl"
              aria-label="Abrir emojis y stickers"
            >
              🙂
            </button>
          </div>
          {canSend ? (
            <button
              type="submit"
              className="inline-flex size-10 items-center justify-center rounded-full bg-cyan-300 text-base font-medium text-slate-950 shadow-sm transition hover:opacity-90 sm:size-11"
              aria-label={strings.comments.send}
            >
              ➤
            </button>
          ) : (
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              disabled={sending || uploading}
              className="inline-flex size-10 items-center justify-center rounded-full bg-cyan-300 text-base font-medium text-slate-950 shadow-sm transition hover:opacity-90 disabled:opacity-60 sm:size-11"
              aria-label="Enviar audio"
            >
              🎤
            </button>
          )}
        </div>
      </form>

      {imageModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => setImageModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[95vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImageModal(null)}
              className="absolute -right-2 -top-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/75 text-lg text-white"
              aria-label="Cerrar vista previa"
            >
              ×
            </button>
            <Image
              src={imageModal.src}
              alt={imageModal.alt}
              width={1200}
              height={1200}
              className="max-h-[90vh] w-auto max-w-[95vw] rounded-2xl object-contain shadow-2xl"
              unoptimized
            />
            {imageModal.isViewOnce && !imageModal.isMine ? (
              <p className="mt-2 text-center text-xs text-white/90">Imagen de una sola vista. Al cerrar ya no podrás abrirla otra vez.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
