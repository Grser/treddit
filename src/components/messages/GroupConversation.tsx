"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { validateUploadSize } from "@/lib/upload";
import { uploadFile } from "@/lib/clientUpload";
import EmojiPicker from "@/components/EmojiPicker";
import MentionUserLink from "@/components/MentionUserLink";

import type { GroupMessageEntry } from "@/lib/messages";

type GroupMember = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  can_send_messages?: boolean;
};

type SearchUser = {
  id: number;
  username: string;
  nickname: string | null;
};

const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
const QUICK_EMOJIS = ["😀", "😂", "🔥", "❤️", "👏", "😮", "🙏", "🎉"] as const;
const GROUP_STICKERS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbThwajQ0YXFreXQyb3h2b2N0NWFjYnR5ZzIybDh6OHN5b2N2YWw1NCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oriO0OEd9QIDdllqo/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm1ydGVvM2hyZ3l4YWZsM2lmbnBqeHlkam95cnRwNTNqem9iaHV4dCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/Cmr1OMJ2FN0B2/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnRjcThhajk5NjN3Z2N4YXN6aG12N3NoYjJ3M2E3dDdnYjhzeW40aCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/TBddd797slSxO/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG0yNnN1cWQ5OHQyc3F3NGJ5Y2FmMm5mb2w2bDU2cWhhY2tiNGo0aCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/Yl5aO3gdVfsQ0/giphy.gif",
] as const;

type SharedPostPreview = {
  id: number;
  username: string;
  nickname: string;
  description: string | null;
  mediaUrl: string | null;
  isSensitive: boolean;
  canViewSensitive: boolean;
};

type LinkPreview = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
};

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

function mergeMessagesById(current: GroupMessageEntry[], incoming: GroupMessageEntry[]) {
  const map = new Map<number, GroupMessageEntry>();
  [...current, ...incoming].forEach((item) => map.set(item.id, item));
  return [...map.values()].sort((a, b) => a.id - b.id);
}

function roleLabel(role: GroupMember["role"]) {
  if (role === "owner") return "Creador";
  if (role === "admin") return "Admin. del grupo";
  return "Miembro";
}

function formatMessageTime(dateInput: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateInput));
}

function parseSticker(text: string | null | undefined) {
  if (!text) return null;
  const match = text.trim().match(/^\[\[sticker:(https?:\/\/[^\s\]]+)\]\]$/i);
  if (!match) return null;
  return match[1];
}

function extractUrls(text: string | null | undefined) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"'`]+/gi) || [];
  return [...new Set(matches.map((url) => url.replace(/[),.;!?]+$/g, "")))];
}

function renderMessageText(text: string) {
  const urlChunks = text.split(/(https?:\/\/[^\s<>"'`]+)/gi);
  return urlChunks.map((chunk, chunkIndex) => {
    if (/^https?:\/\/[^\s<>"'`]+$/i.test(chunk)) {
      const href = chunk.replace(/[),.;!?]+$/g, "");
      return (
        <a
          key={`url-${href}-${chunkIndex}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sky-400 underline decoration-sky-400/70 underline-offset-2"
        >
          {href}
        </a>
      );
    }
    const mentionParts = chunk.split(/([@][\p{L}\p{N}_]+)/gu);
    return mentionParts.map((part, index) => {
      if (/^@[\p{L}\p{N}_]+$/u.test(part)) {
        const username = part.slice(1);
        return <MentionUserLink key={`${part}-${chunkIndex}-${index}`} username={username} text={part} className="font-medium" />;
      }
      return <span key={`text-${chunkIndex}-${index}`}>{part}</span>;
    });
  });
}

export default function GroupConversation({
  groupId,
  viewerId,
  initialMessages,
  initialGroup,
}: {
  groupId: number;
  viewerId: number;
  initialMessages: GroupMessageEntry[];
  initialGroup: {
    name: string;
    description: string | null;
    avatar_url: string | null;
    members: GroupMember[];
    canManage: boolean;
    myRole: "owner" | "admin" | "member";
    speakerRequests?: SearchUser[];
  };
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const latestIdRef = useRef(initialMessages[initialMessages.length - 1]?.id ?? 0);
  const messagesListRef = useRef<HTMLUListElement | null>(null);
  const sendingRef = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState(initialGroup.name);
  const [description, setDescription] = useState(initialGroup.description || "");
  const [avatarUrl, setAvatarUrl] = useState(initialGroup.avatar_url || "");
  const [members, setMembers] = useState<GroupMember[]>(initialGroup.members || []);
  const [canManage, setCanManage] = useState(Boolean(initialGroup.canManage));
  const [myRole, setMyRole] = useState(initialGroup.myRole);
  const [speakerRequests, setSpeakerRequests] = useState<SearchUser[]>(initialGroup.speakerRequests || []);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [sharedPostPreviews, setSharedPostPreviews] = useState<Record<number, SharedPostPreview | null>>({});
  const [revealedSensitivePosts, setRevealedSensitivePosts] = useState<Record<number, boolean>>({});
  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreview | null>>({});
  const [messageMenuId, setMessageMenuId] = useState<number | null>(null);
  const [showStickerTray, setShowStickerTray] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessageEntry | null>(null);
  const [attachments, setAttachments] = useState<GroupMessageEntry["attachments"]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [oneTimeImageMode, setOneTimeImageMode] = useState(false);
  const [manageView, setManageView] = useState<"general" | "members" | "roles">("general");
  const [mentionQuery, setMentionQuery] = useState("");
  const [groupMentionResults, setGroupMentionResults] = useState<GroupMember[]>([]);
  const shouldAutoScrollRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const groupAvatar = avatarUrl || "/demo-reddit.png";

  const myMember = members.find((member) => member.id === viewerId);
  const canSendMessages = myRole === "owner" || myRole === "admin" || Boolean(myMember?.can_send_messages ?? true);

  useEffect(() => {
    const match = text.match(/(?:^|\s)@([\p{L}\p{N}_]{0,32})$/u);
    const query = match ? match[1].toLowerCase() : "";
    setMentionQuery(query);
  }, [text]);

  useEffect(() => {
    if (!mentionQuery && !text.endsWith("@")) {
      setGroupMentionResults([]);
      return;
    }
    const normalized = mentionQuery.trim().toLowerCase();
    const filtered = members
      .filter((member) => member.id !== viewerId)
      .filter((member) => {
        if (!normalized) return true;
        const haystack = `${member.username} ${member.nickname || ""}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
    setGroupMentionResults(filtered);
  }, [mentionQuery, members, text, viewerId]);

  function insertGroupMention(username: string) {
    setText((prev) => prev.replace(/(?:^|\s)@[\p{L}\p{N}_]{0,32}$/u, (full) => `${full[0] === " " ? " " : ""}@${username} `));
    setGroupMentionResults([]);
  }

  function addEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
  }

  async function handleAttachmentUpload(file: File | null) {
    if (!file || !canSendMessages || sendingRef.current || uploadingAttachment) return;
    setSendError(null);
    setUploadingAttachment(true);
    try {
      validateUploadSize(file);
      const payload = await uploadFile(file, { scope: "chat" });
      const uploadedUrl = payload.url;
      if (typeof uploadedUrl !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo subir el archivo");
      }
      const fileType = file.type || "";
      const normalizedType = fileType.startsWith("image/")
        ? "image"
        : fileType.startsWith("video/")
          ? "video"
          : fileType.startsWith("audio/")
            ? "audio"
            : "file";
      setAttachments((prev) => [
        ...(prev || []),
        {
          url: uploadedUrl,
          type: normalizedType,
          name: file.name || null,
          viewOnce: normalizedType === "image" ? oneTimeImageMode : false,
          viewedByRecipientAt: null,
        },
      ]);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/messages/groups/${groupId}/messages?afterId=${latestIdRef.current}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!Array.isArray(payload.messages) || payload.messages.length === 0) return;
      setMessages((prev) => mergeMessagesById(prev, payload.messages as GroupMessageEntry[]));
    }, 1500);
    return () => clearInterval(id);
  }, [groupId]);

  useEffect(() => {
    const container = messagesListRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceToBottom < 260;
    };
    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [groupId]);

  useEffect(() => {
    const container = messagesListRef.current;
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
    const container = messagesListRef.current;
    shouldAutoScrollRef.current = true;
    initialScrollDoneRef.current = false;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      initialScrollDoneRef.current = true;
    });
  }, [groupId]);

  useEffect(() => {
    const markRead = async () => {
      try {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId }),
        });
        window.dispatchEvent(new CustomEvent("treddit:messages-read"));
      } catch {
        // noop
      }
    };
    void markRead();
  }, [groupId, messages]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("[data-message-menu-root='true']")) {
        setMessageMenuId(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMessageMenuId(null);
      setShowStickerTray(false);
      setShowSettings(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const canSendMessage = Boolean(
    canSendMessages
    && !sendingRef.current
    && !uploadingAttachment
    && (text.trim().length > 0 || (attachments?.length ?? 0) > 0),
  );

  async function handleReaction(messageId: number, emoji: string) {
    try {
      await fetch("/api/messages/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, messageId, emoji }),
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
      const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
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

  useEffect(() => {
    const urls = [...new Set(messages.flatMap((message) => {
      if (parseSharedPostText(message.text)) return [];
      return extractUrls(message.text);
    }))];
    const missing = urls.filter((url) => !(url in linkPreviews));
    if (!missing.length) return;

    let active = true;
    const loadPreviews = async () => {
      const results = await Promise.all(missing.map(async (url) => {
        try {
          const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok || !payload.preview) return [url, null] as const;
          return [url, payload.preview as LinkPreview] as const;
        } catch {
          return [url, null] as const;
        }
      }));
      if (!active) return;
      setLinkPreviews((prev) => {
        const next = { ...prev };
        results.forEach(([url, preview]) => {
          next[url] = preview;
        });
        return next;
      });
    };

    void loadPreviews();
    return () => {
      active = false;
    };
  }, [linkPreviews, messages]);

  useEffect(() => {
    const sharedPostIds = [
      ...new Set(
        messages
          .map((message) => parseSharedPostText(message.text)?.postId)
          .filter((id): id is number => Boolean(id)),
      ),
    ];

    const missing = sharedPostIds.filter((id) => !(id in sharedPostPreviews));
    if (!missing.length) return;

    let active = true;

    const loadSharedPosts = async () => {
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`/api/posts/${id}`, { cache: "no-store" });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.item) return [id, null] as const;
            const item = payload.item;
            return [
              id,
              {
                id,
                username: String(item.username || ""),
                nickname: String(item.nickname || item.username || "Publicación"),
                description: item.description ? String(item.description) : null,
                mediaUrl: item.mediaUrl ? String(item.mediaUrl) : null,
                isSensitive: Boolean(item.is_sensitive),
                canViewSensitive: Boolean(item.can_view_sensitive),
              },
            ] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );

      if (!active) return;
      setSharedPostPreviews((prev) => {
        const next = { ...prev };
        results.forEach(([id, data]) => {
          next[id] = data;
        });
        return next;
      });
    };

    void loadSharedPosts();
    return () => {
      active = false;
    };
  }, [messages, sharedPostPreviews]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#2a3942] bg-[#202c33] px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={groupAvatar}
            alt={name}
            width={42}
            height={42}
            className="size-10 rounded-full object-cover"
            unoptimized
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{name}</h1>
            <p className="text-xs opacity-70">Grupo · {members.length} integrantes · Tu rol: {roleLabel(myRole)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowSettings((prev) => !prev);
            setManageView("general");
          }}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs"
        >
          {canManage ? "Editar grupo" : "Info del grupo"}
        </button>
      </div>
      {showSettings && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-3 backdrop-blur-sm md:items-center md:p-6">
          <div className="hide-scrollbar max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border/80 bg-gradient-to-b from-background/95 to-surface/90 p-3.5 shadow-2xl md:max-h-[85dvh]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Editar grupo</p>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-full border border-border px-3 py-1 text-xs"
              >
                Cerrar
              </button>
            </div>
          <div className="rounded-2xl border border-border/80 bg-input/40 p-3">
            <div className="flex items-center gap-3">
              <Image
                src={groupAvatar}
                alt={name}
                width={56}
                height={56}
                className="size-14 rounded-full object-cover"
                unoptimized
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{name}</p>
                <p className="text-xs opacity-70">Grupo · {members.length} miembros</p>
                {description && <p className="mt-1 line-clamp-2 text-xs opacity-80">{description}</p>}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManageView("general")}
                className={`rounded-full border px-3 py-1.5 text-xs ${manageView === "general" ? "border-brand bg-brand/20 text-white" : "border-border text-foreground/80"}`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setManageView("members")}
                className={`rounded-full border px-3 py-1.5 text-xs ${manageView === "members" ? "border-brand bg-brand/20 text-white" : "border-border text-foreground/80"}`}
              >
                Miembros
              </button>
              <button
                type="button"
                onClick={() => setManageView("roles")}
                className={`rounded-full border px-3 py-1.5 text-xs ${manageView === "roles" ? "border-brand bg-brand/20 text-white" : "border-border text-foreground/80"}`}
              >
                Roles y permisos
              </button>
            </div>
          )}

          {canManage && manageView === "general" && (
            <section className="rounded-2xl border border-border/70 bg-background/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand/90">Ajustes de admin</p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="Nombre"
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="Descripción"
              />
              <div className="mt-2 rounded-xl border border-border bg-input/60 p-2 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Foto del grupo</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs">
                    {uploadingAvatar ? "Subiendo…" : "Subir imagen"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setSettingsError(null);
                        setUploadingAvatar(true);
                        try {
                          validateUploadSize(file);

                          const payload = await uploadFile(file, { scope: "chat" });
                          if (typeof payload.url !== "string") {
                            throw new Error(
                              typeof payload.error === "string"
                                ? payload.error
                                : "No se pudo subir la imagen",
                            );
                          }
                          setAvatarUrl(payload.url);
                        } catch (error) {
                          setSettingsError(error instanceof Error ? error.message : "No se pudo subir la imagen");
                        } finally {
                          setUploadingAvatar(false);
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1.5 text-xs"
                      onClick={() => setAvatarUrl("")}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {avatarUrl && <p className="mt-2 truncate opacity-70">{avatarUrl}</p>}
              </div>

              <input
                value={userQuery}
                onChange={async (event) => {
                  const value = event.target.value;
                  setUserQuery(value);
                  if (value.trim().length < 2) {
                    setUserResults([]);
                    return;
                  }
                  const res = await fetch(`/api/users/search?q=${encodeURIComponent(value.trim())}`);
                  const payload = await res.json().catch(() => ({}));
                  if (res.ok && Array.isArray(payload.items)) {
                    const existing = new Set(members.map((member) => member.id));
                    setUserResults((payload.items as SearchUser[]).filter((item) => !existing.has(item.id)));
                  }
                }}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="Agregar personas"
              />
              {userResults.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-border/70">
                  {userResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-background/70"
                      onClick={async () => {
                        const res = await fetch(`/api/messages/groups/${groupId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ addMemberIds: [item.id] }),
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (res.ok && payload.group?.members) {
                          setMembers(payload.group.members as GroupMember[]);
                          setCanManage(Boolean(payload.group.canManage));
                          setMyRole((payload.group.myRole as "owner" | "admin" | "member") || "member");
                        }
                        setUserResults([]);
                        setUserQuery("");
                      }}
                    >
                      {item.nickname || item.username} <span className="opacity-70">@{item.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {(!canManage || manageView !== "general") && (
          <>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {canManage && manageView === "roles" ? "Roles y permisos" : "Miembros"}
          </p>
          <div className="space-y-2">
            {members.map((member) => (
                
              <div key={member.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/40 px-2 py-2 text-xs">
                <Image
                  src={member.avatar_url || "/demo-reddit.png"}
                  alt={member.nickname || member.username}
                  width={28}
                  height={28}
                  className="size-7 rounded-full object-cover"
                  unoptimized
                />
                <Link href={`/u/${member.username}`} className="min-w-0 flex-1 truncate hover:underline">
                  {member.nickname || member.username} <span className="opacity-65">@{member.username}</span>
                </Link>
                <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5">{roleLabel(member.role)}</span>
                {canManage && manageView !== "general" && member.id !== viewerId && member.role !== "owner" && (
                  <button
                    type="button"
                    className="rounded-full border border-border px-2 py-0.5"
                    onClick={async () => {
                      const key = member.can_send_messages ? "blockSendMemberIds" : "allowSendMemberIds";
                      const res = await fetch(`/api/messages/groups/${groupId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ [key]: [member.id] }),
                      });
                      const payload = await res.json().catch(() => ({}));
                      if (res.ok && payload.group?.members) {
                        setMembers(payload.group.members as GroupMember[]);
                        setSpeakerRequests((payload.group.speakerRequests as SearchUser[]) || []);
                      }
                    }}
                  >
                    {member.can_send_messages ? "Silenciar" : "Permitir hablar"}
                  </button>
                )}
                {canManage && manageView === "roles" && member.id !== viewerId && member.role !== "owner" && (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-border px-2 py-0.5"
                      onClick={async () => {
                        const key = member.role === "admin" ? "demoteMemberIds" : "promoteMemberIds";
                        const res = await fetch(`/api/messages/groups/${groupId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ [key]: [member.id] }),
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (res.ok && payload.group?.members) {
                          setMembers(payload.group.members as GroupMember[]);
                        }
                      }}
                    >
                      {member.role === "admin" ? "Quitar admin" : "Hacer admin"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-rose-400/50 px-2 py-0.5 text-rose-300"
                      onClick={async () => {
                        const res = await fetch(`/api/messages/groups/${groupId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ removeMemberIds: [member.id] }),
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (res.ok && payload.group?.members) {
                          setMembers(payload.group.members as GroupMember[]);
                        }
                      }}
                    >
                      Quitar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          </>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {canManage && (
              <button
                type="button"
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                onClick={async () => {
                  setSettingsError(null);
                  setSavingChanges(true);
                  try {
                    const res = await fetch(`/api/messages/groups/${groupId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, description, avatarUrl }),
                    });
                    const payload = await res.json().catch(() => ({}));
                    if (res.ok && payload.group) {
                      setName(payload.group.name as string);
                      setDescription((payload.group.description as string | null) || "");
                      setAvatarUrl((payload.group.avatar_url as string | null) || "");
                      setMembers((payload.group.members as GroupMember[]) || []);
                      setCanManage(Boolean(payload.group.canManage));
                      setMyRole((payload.group.myRole as "owner" | "admin" | "member") || "member");
                    } else {
                      setSettingsError(
                        typeof payload.error === "string" ? payload.error : "No se pudo guardar el grupo",
                      );
                    }
                  } catch {
                    setSettingsError("No se pudo guardar el grupo");
                  } finally {
                    setSavingChanges(false);
                  }
                }}
                disabled={savingChanges || uploadingAvatar || leavingGroup}
              >
                {savingChanges ? "Guardando…" : "Guardar cambios"}
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-rose-400/50 px-3 py-1.5 text-xs font-semibold text-rose-300"
              disabled={leavingGroup || savingChanges || uploadingAvatar}
              onClick={async () => {
                const confirmLeave = window.confirm("¿Seguro que quieres salir de este grupo?");
                if (!confirmLeave) return;
                setSettingsError(null);
                setLeavingGroup(true);
                try {
                  const res = await fetch(`/api/messages/groups/${groupId}`, { method: "DELETE" });
                  const payload = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo salir del grupo");
                  }
                  window.location.href = "/mensajes";
                } catch (error) {
                  setSettingsError(error instanceof Error ? error.message : "No se pudo salir del grupo");
                  setLeavingGroup(false);
                }
              }}
            >
              {leavingGroup ? "Saliendo…" : "Salir del grupo"}
            </button>
            {myRole === "owner" && (
              <button
                type="button"
                className="rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300"
                disabled={leavingGroup || savingChanges || uploadingAvatar}
                onClick={async () => {
                  const confirmDelete = window.confirm("¿Seguro que quieres eliminar este grupo para todos?");
                  if (!confirmDelete) return;
                  setSettingsError(null);
                  setLeavingGroup(true);
                  try {
                    const res = await fetch(`/api/messages/groups/${groupId}?mode=delete`, { method: "DELETE" });
                    const payload = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo eliminar el grupo");
                    }
                    window.location.href = "/mensajes";
                  } catch (error) {
                    setSettingsError(error instanceof Error ? error.message : "No se pudo eliminar el grupo");
                    setLeavingGroup(false);
                  }
                }}
              >
                {leavingGroup ? "Procesando…" : "Eliminar grupo"}
              </button>
            )}
          </div>
          {canManage && manageView === "roles" && speakerRequests.length > 0 && (
            <div className="mt-3 rounded-xl border border-border bg-input/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Solicitudes para hablar</p>
              <div className="mt-2 space-y-2">
                {speakerRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>{request.nickname || request.username} (@{request.username})</span>
                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1"
                      onClick={async () => {
                        setSettingsError(null);
                        const res = await fetch(`/api/messages/groups/${groupId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ approveSpeakerRequestUserIds: [request.id] }),
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (!res.ok || !payload.group) {
                          setSettingsError(typeof payload.error === "string" ? payload.error : "No se pudo aprobar la solicitud");
                          return;
                        }
                        setMembers(payload.group.members || []);
                        setSpeakerRequests(payload.group.speakerRequests || []);
                      }}
                    >
                      Aprobar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!canManage && (
            <p className="text-xs opacity-70">
              Solo administradores pueden editar nombre, foto, miembros y roles del grupo.
            </p>
          )}
          {settingsError && <p className="mt-2 text-xs text-rose-400">{settingsError}</p>}
          </div>
        </div>
      )}
      <ul ref={messagesListRef} className="hide-scrollbar mt-2 min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto rounded-2xl wa-wallpaper px-2 pr-0.5 pb-6 [overflow-anchor:none] sm:pr-1 sm:pb-8">
        {messages.map((msg, index) => {
          const mine = msg.senderId === viewerId;
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const prevSameSender = previous?.senderId === msg.senderId;
          const nextSameSender = next?.senderId === msg.senderId;
          const showAvatar = !mine && !prevSameSender;
          const showHeader = !mine && !prevSameSender;
          const sharedPost = parseSharedPostText(msg.text);
          const preview = sharedPost ? sharedPostPreviews[sharedPost.postId] : null;
          const isPostUnavailable = preview === null;
          const isSensitiveBlocked = Boolean(preview?.isSensitive && !preview?.canViewSensitive);
          const canRevealSensitive = Boolean(preview?.isSensitive && preview?.canViewSensitive);
          const isSensitiveRevealed = Boolean(sharedPost && revealedSensitivePosts[sharedPost.postId]);
          const shouldShowMedia = Boolean(preview?.mediaUrl) && (!preview?.isSensitive || isSensitiveRevealed);
          const avatar = msg.sender.avatar_url?.trim() || "/demo-reddit.png";
          const stickerUrl = parseSticker(msg.text);

          return (
            <li key={msg.id} className={`group/message flex ${mine ? "justify-end" : "justify-start"} ${prevSameSender ? "mt-0.5" : "mt-2.5"}`}>
              <div className={`flex max-w-[98%] items-end gap-2 md:max-w-[92%] ${mine ? "flex-row-reverse" : "flex-row"}`}>
                {!mine && (
                  showAvatar ? (
                    <Image
                      src={avatar}
                      alt={msg.sender.nickname || msg.sender.username}
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover"
                      unoptimized
                    />
                  ) : <div className="size-8" />
                )}
                <div
                  className={`relative max-w-[92%] rounded-2xl px-3 py-2 text-sm shadow-lg shadow-black/20 sm:px-4 ${
                    mine ? "border border-[#005c4b] bg-[#005c4b] text-[#e9edef]" : "border border-[#202c33] bg-[#202c33] text-[#e9edef]"
                  }`}
                >
                  <div data-message-menu-root="true">
                    <button
                      type="button"
                      onClick={() => setMessageMenuId((prev) => (prev === msg.id ? null : msg.id))}
                      className={`absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-xs transition ${mine ? "bg-brand/15 text-foreground/90 hover:bg-brand/25" : "bg-background/80 text-foreground/80 hover:bg-muted"}`}
                      aria-label="Abrir menú"
                    >
                      ▾
                    </button>
                  </div>
                  {showHeader && (
                    <p className="mb-1 text-[11px] font-semibold text-brand/90">
                      <Link href={`/u/${msg.sender.username}`} className="hover:underline">{msg.sender.nickname || msg.sender.username}</Link>
                    </p>
                  )}
                  {msg.replyTo && (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(msg)}
                      className={`mb-2 block w-full rounded-xl border px-2 py-1 text-left text-xs ${
                        mine ? "border-brand/40 bg-brand/10 text-foreground/85" : "border-border/80 bg-background/70 text-foreground/80"
                      }`}
                    >
                      <p className="font-semibold opacity-90">{msg.replyTo.senderNickname || msg.replyTo.senderUsername}</p>
                      <p className="line-clamp-2 opacity-80">{msg.replyTo.text || "Mensaje"}</p>
                    </button>
                  )}
                  {!sharedPost && !stickerUrl ? (
                    <div className="space-y-2">
                      <p className="whitespace-pre-wrap break-words">{renderMessageText(msg.text || "")}</p>
                      {(() => {
                        const firstUrl = extractUrls(msg.text)[0];
                        const preview = firstUrl ? linkPreviews[firstUrl] : null;
                        if (!preview) return null;
                        return (
                          <a
                            href={preview.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`block overflow-hidden rounded-2xl border p-2 transition hover:scale-[1.01] ${mine ? "border-brand/35 bg-brand/10" : "border-border bg-background/80"}`}
                          >
                            {preview.image ? (
                              <Image src={preview.image} alt={preview.title} width={360} height={220} className="h-[150px] w-full rounded-xl object-cover" unoptimized />
                            ) : null}
                            <p className="mt-2 line-clamp-1 text-xs font-semibold">{preview.title}</p>
                            <p className="text-[11px] opacity-70">{preview.domain}</p>
                            {preview.description ? <p className="mt-1 line-clamp-2 text-xs opacity-80">{preview.description}</p> : null}
                          </a>
                        );
                      })()}
                    </div>
                  ) : stickerUrl ? (
                    <Image
                      src={stickerUrl}
                      alt="Sticker"
                      width={180}
                      height={180}
                      className="h-[180px] w-[180px] max-w-full object-contain"
                      unoptimized
                    />
                  ) : sharedPost ? (
                    <div className="space-y-2">
                      {sharedPost.intro ? <p className="text-xs opacity-85">{sharedPost.intro}</p> : null}
                      <Link
                        href={`/p/${sharedPost.postId}`}
                        className="block rounded-2xl border border-border/80 bg-background/60 p-2 hover:bg-background/80"
                      >
                        <p className="text-[11px] uppercase tracking-wide opacity-70">Publicación compartida</p>
                        {shouldShowMedia ? (
                          <Image
                            src={preview?.mediaUrl || ""}
                            alt={preview?.description || "Post compartido"}
                            width={420}
                            height={260}
                            className="mt-2 max-h-52 w-full rounded-xl object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="mt-2 flex h-24 w-full items-center justify-center rounded-xl bg-background/60 px-3 text-center text-xs">
                            {isSensitiveBlocked
                              ? "Contenido sensible bloqueado. Debes verificar tu edad para verlo."
                              : canRevealSensitive
                                ? "Contenido sensible. Toca “Ver contenido” para mostrarlo."
                                : isPostUnavailable
                                  ? "Publicación no disponible, ya no existe."
                                  : "Vista previa no disponible."}
                          </div>
                        )}
                        <p className="mt-2 text-sm font-semibold">{preview?.nickname || "Publicación no disponible"}</p>
                        <p className="text-xs opacity-80">
                          {isSensitiveBlocked
                            ? "Contenido sensible bloqueado. Debes verificar tu edad para verlo."
                            : isPostUnavailable
                              ? "Publicación no disponible, ya no existe."
                              : preview?.description || "Mira la publicación que te compartieron."}
                        </p>
                        {canRevealSensitive && sharedPost ? (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setRevealedSensitivePosts((prev) => ({
                                  ...prev,
                                  [sharedPost.postId]: !isSensitiveRevealed,
                                }));
                              }}
                              className="rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide hover:bg-brand/25"
                            >
                              {isSensitiveRevealed ? "Ocultar imagen" : "Ver contenido"}
                            </button>
                          </div>
                        ) : null}
                      </Link>
                    </div>
                  ) : null}
                  {msg.attachments?.length ? (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((file) => (
                        <div key={`${msg.id}-${file.url}`} className="overflow-hidden rounded-xl border border-border/70 bg-background/60 p-2">
                          {file.type === "image" ? (
                            <Image src={file.url} alt={file.name || "Imagen adjunta"} width={420} height={300} className="max-h-60 w-full rounded-lg object-cover" unoptimized />
                          ) : file.type === "video" ? (
                            <video src={file.url} controls className="max-h-60 w-full rounded-lg" />
                          ) : file.type === "audio" ? (
                            <audio src={file.url} controls className="w-full" />
                          ) : (
                            <a href={file.url} target="_blank" rel="noreferrer" className="text-xs underline">Descargar {file.name || "archivo"}</a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!mine && !nextSameSender ? <p className="mt-1 text-[10px] opacity-65">{formatMessageTime(msg.createdAt)}</p> : null}
                  {mine ? <p className="mt-1 text-[10px] text-foreground/70">{formatMessageTime(msg.createdAt)}</p> : null}
                  {(msg.reactions?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries((msg.reactions || []).reduce<Record<string, number>>((acc, reaction) => {
                        acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                        return acc;
                      }, {})).map(([emoji, total]) => (
                        <span key={`${msg.id}-${emoji}`} className={`w-fit rounded-full border px-2 py-0.5 text-sm shadow transition ${mine ? "border-brand/35 bg-brand/15 text-foreground" : "border-border bg-background/80 text-foreground"}`}>
                          {emoji} {total}
                        </span>
                      ))}
                    </div>
                  )}
                  <div data-message-menu-root="true" className={`relative mt-1 flex flex-wrap items-center gap-2 pr-8 transition-opacity ${mine ? "justify-end" : "justify-start"} ${messageMenuId === msg.id ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}>
                    {messageMenuId === msg.id && (
                      <div className={`absolute bottom-8 z-20 w-52 max-w-[min(13rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface/95 p-2 shadow-xl backdrop-blur ${mine ? "right-0" : "left-0"}`}>
                        <div className="mb-2 flex flex-wrap gap-1 border-b border-border pb-2">
                          {MESSAGE_REACTIONS.map((emoji) => (
                            <button key={`${msg.id}-${emoji}`} type="button" className="rounded-full border border-transparent px-2 py-1 text-base transition hover:border-border hover:bg-muted" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="mb-1 block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                          onClick={() => {
                            setReplyingTo(msg);
                            setMessageMenuId(null);
                          }}
                        >
                          Responder
                        </button>
                        <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => setMessageMenuId(null)}>Cerrar</button>
                        {mine ? <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs text-rose-300 hover:bg-rose-500/10" onClick={() => handleDeleteMessage(msg.id)}>Eliminar mensaje</button> : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!canSendMessages && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs">
          No tienes permiso para hablar en este grupo.
          <button
            type="button"
            className="ml-2 underline"
            onClick={async () => {
              const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestSpeak: true }),
              });
              setSendError(res.ok ? "Solicitud enviada al administrador." : "No se pudo enviar la solicitud.");
            }}
          >
            Solicitar permiso
          </button>
        </div>
      )}
      <form
        className="z-10 shrink-0 space-y-3 rounded-2xl border p-2.5 shadow-2xl shadow-black/25 backdrop-blur sm:p-3.5 md:rounded-3xl md:p-4 wa-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = text.trim();
          if ((!trimmed && (attachments?.length ?? 0) === 0) || sendingRef.current || !canSendMessages) return;
          sendingRef.current = true;
          setSendError(null);
          try {
            const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: trimmed,
                attachments,
                replyToMessageId: replyingTo?.id ?? null,
              }),
            });
            const payload = await res.json().catch(() => ({}));
            if (res.ok && payload.message) {
              shouldAutoScrollRef.current = true;
              setMessages((prev) => mergeMessagesById(prev, [payload.message as GroupMessageEntry]));
              setText("");
              setAttachments([]);
              setReplyingTo(null);
              setShowStickerTray(false);
            } else {
              setSendError(typeof payload.error === "string" ? payload.error : "No se pudo enviar el mensaje");
            }
          } finally {
            sendingRef.current = false;
          }
        }}
      >
        {replyingTo && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-input/70 px-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold">Respondiendo a {replyingTo.sender.nickname || replyingTo.sender.username}</p>
              <p className="line-clamp-2 opacity-80">{replyingTo.text || "Mensaje con adjunto"}</p>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-sm opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-input/50 p-2">
            {attachments.map((file, index) => (
              <div key={`${file.url}-${index}`} className="relative overflow-hidden rounded-xl border border-border/70 bg-background/50 p-1.5">
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => (prev || []).filter((_, fileIndex) => fileIndex !== index))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] text-white"
                >
                  ✕
                </button>
                {file.type === "image" ? (
                  <Image src={file.url} alt={file.name || "Adjunto"} width={96} height={96} className="size-24 rounded-lg object-cover" unoptimized />
                ) : file.type === "video" ? (
                  <video src={file.url} controls className="h-24 w-28 rounded-lg" />
                ) : file.type === "audio" ? (
                  <audio src={file.url} controls className="w-48" />
                ) : (
                  <a href={file.url} target="_blank" rel="noreferrer" className="block max-w-36 truncate px-2 py-2 text-xs underline">{file.name || "Archivo"}</a>
                )}
              </div>
            ))}
          </div>
        )}
        {showStickerTray && canSendMessages && (
          <div className="space-y-2 rounded-2xl border border-border bg-background/90 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="rounded-full border border-border px-2 py-1 text-sm hover:bg-muted"
                  disabled={sendingRef.current}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <EmojiPicker onSelect={addEmoji} />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Stickers</p>
              <div className="flex flex-wrap gap-2">
                {GROUP_STICKERS.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={async () => {
                      if (sendingRef.current) return;
                      sendingRef.current = true;
                      setSendError(null);
                      try {
                        const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ text: `[[sticker:${url}]]` }),
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (res.ok && payload.message) {
                          shouldAutoScrollRef.current = true;
                          setMessages((prev) => mergeMessagesById(prev, [payload.message as GroupMessageEntry]));
                        } else {
                          setSendError(typeof payload.error === "string" ? payload.error : "No se pudo enviar el sticker");
                        }
                      } finally {
                        sendingRef.current = false;
                      }
                    }}
                    className="overflow-hidden rounded-2xl border border-border bg-background/70 p-1 transition hover:scale-[1.03] hover:bg-muted"
                    disabled={sendingRef.current}
                    title={`Sticker ${index + 1}`}
                  >
                    <Image src={url} alt={`Sticker ${index + 1}`} width={64} height={64} className="size-14 object-contain" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="relative">
          {(groupMentionResults.length > 0 && canSendMessages) && (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(19rem,90vw)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
              {groupMentionResults.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertGroupMention(member.username)}
                  className="flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/70"
                >
                  <Image src={member.avatar_url || "/demo-reddit.png"} alt={member.username} width={30} height={30} className="size-7 rounded-full object-cover" unoptimized />
                  <span>{member.nickname || member.username} <span className="opacity-70">@{member.username}</span></span>
                </button>
              ))}
            </div>
          )}
          <div className="flex min-w-0 flex-1 items-end gap-1.5 pr-0.5 sm:gap-2 sm:pr-1">
            <button
              type="button"
              onClick={() => setOneTimeImageMode((prev) => !prev)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition sm:px-3 ${oneTimeImageMode ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-border bg-input text-foreground hover:bg-muted"}`}
              disabled={!canSendMessages || sendingRef.current || uploadingAttachment}
            >
              1 vez
            </button>
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              onChange={(event) => {
                void handleAttachmentUpload(event.target.files?.[0] || null);
              }}
              disabled={!canSendMessages || sendingRef.current || uploadingAttachment}
            />
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-input text-base transition hover:bg-muted disabled:opacity-50"
              disabled={!canSendMessages || sendingRef.current || uploadingAttachment}
              aria-label="Adjuntar archivo"
              title="Adjuntar archivo"
            >
              📎
            </button>
            <div className="flex min-w-0 flex-1 items-end gap-1.5 rounded-[24px] wa-input px-2 py-2 ring-1 ring-brand/20 focus-within:ring-2 focus-within:ring-brand/45 sm:gap-2 sm:rounded-[26px] sm:px-3 sm:py-2.5">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                className="max-h-28 min-h-6 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]"
                rows={1}
                placeholder={canSendMessages ? "Escribe un mensaje" : "Solo lectura"}
                disabled={!canSendMessages || sendingRef.current || uploadingAttachment}
              />
              <button
                type="button"
                onClick={() => setShowStickerTray((prev) => !prev)}
                className="pb-1 pr-0.5 text-lg opacity-80 transition hover:opacity-100 sm:text-xl"
                disabled={!canSendMessages || sendingRef.current || uploadingAttachment}
                aria-label="Abrir emojis y stickers"
              >
                🙂
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}@`)}
                className="pb-1 text-xs font-semibold opacity-75 transition hover:opacity-100"
                disabled={!canSendMessages || sendingRef.current || uploadingAttachment}
              >
                @
              </button>
            </div>
            <button type="submit" disabled={!canSendMessage} className="inline-flex size-10 items-center justify-center rounded-full bg-[#00a884] text-base font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 sm:size-11">
              ➤
            </button>
          </div>
        </div>
      </form>
      {sendError && <p className="text-xs text-rose-400">{sendError}</p>}
    </div>
  );
}
