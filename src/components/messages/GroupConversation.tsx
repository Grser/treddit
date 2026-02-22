"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { GroupMessageEntry } from "@/lib/messages";

type GroupMember = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
};

type SearchUser = {
  id: number;
  username: string;
  nickname: string | null;
};

const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

type SharedPostPreview = {
  id: number;
  username: string;
  nickname: string;
  description: string | null;
  mediaUrl: string | null;
  isSensitive: boolean;
  canViewSensitive: boolean;
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
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [sharedPostPreviews, setSharedPostPreviews] = useState<Record<number, SharedPostPreview | null>>({});
  const [revealedSensitivePosts, setRevealedSensitivePosts] = useState<Record<number, boolean>>({});
  const [messageMenuId, setMessageMenuId] = useState<number | null>(null);
  const groupAvatar = avatarUrl || "/demo-reddit.png";

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
    const distanceToBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0;
    const shouldStickBottom = distanceToBottom < 120;
    latestIdRef.current = messages[messages.length - 1]?.id ?? 0;
    if (container && shouldStickBottom) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesListRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
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
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
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
          onClick={() => setShowSettings((prev) => !prev)}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs"
        >
          Info del grupo
        </button>
      </div>
      {showSettings && (
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
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
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-70">Ajustes de admin</p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                placeholder="Nombre"
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
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
                          const form = new FormData();
                          form.append("file", file);
                          const res = await fetch("/api/upload", { method: "POST", body: form });
                          const payload = await res.json().catch(() => ({}));
                          if (!res.ok || typeof payload.url !== "string") {
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
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
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
            </>
          )}

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-70">Miembros</p>

          <div className="mt-3 space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 rounded-xl border border-border/70 px-2 py-1.5 text-xs">
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
                {canManage && member.id !== viewerId && member.role !== "owner" && (
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

          {canManage && (
            <button
              type="button"
              className="mt-3 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
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
              disabled={savingChanges || uploadingAvatar}
            >
              {savingChanges ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
          {settingsError && <p className="mt-2 text-xs text-rose-400">{settingsError}</p>}
        </div>
      )}
      <ul ref={messagesListRef} className="hide-scrollbar flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border bg-surface/90 p-3">
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
                  className={`relative max-w-[92%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    mine ? "bg-brand text-white" : "bg-input text-foreground"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setMessageMenuId((prev) => (prev === msg.id ? null : msg.id))}
                    className={`absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-xs transition ${mine ? "bg-white/10 text-white/90 hover:bg-white/20" : "bg-background/80 text-foreground/80 hover:bg-muted"}`}
                    aria-label="Abrir menú"
                  >
                    ▾
                  </button>
                  {showHeader && (
                    <p className="mb-1 text-[11px] font-semibold text-brand/90">
                      <Link href={`/u/${msg.sender.username}`} className="hover:underline">{msg.sender.nickname || msg.sender.username}</Link>
                    </p>
                  )}
                  {!sharedPost ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="space-y-2">
                      {sharedPost.intro ? <p className="text-xs opacity-85">{sharedPost.intro}</p> : null}
                      <a
                        href={sharedPost.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl border border-white/20 bg-black/10 p-2 hover:bg-black/20"
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
                          <div className="mt-2 flex h-24 w-full items-center justify-center rounded-xl bg-black/10 px-3 text-center text-xs">
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
                        {canRevealSensitive && sharedPost && !isSensitiveRevealed ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              setRevealedSensitivePosts((prev) => ({ ...prev, [sharedPost.postId]: true }));
                            }}
                            className="mt-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/20"
                          >
                            Ver contenido
                          </button>
                        ) : null}
                      </a>
                    </div>
                  )}
                  {!mine && !nextSameSender ? (
                    <p className="mt-1 text-[10px] opacity-65">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  ) : null}
                  {mine ? (
                    <p className="mt-1 text-[10px] text-white/70">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  ) : null}
                  {(msg.reactions?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries((msg.reactions || []).reduce<Record<string, number>>((acc, reaction) => {
                        acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                        return acc;
                      }, {})).map(([emoji, total]) => (
                        <span key={`${msg.id}-${emoji}`} className={`w-fit rounded-full border px-2 py-0.5 text-sm shadow transition ${mine ? "border-white/20 bg-white/10 text-white" : "border-border bg-background/80 text-foreground"}`}>
                          {emoji} {total}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`relative mt-1 flex flex-wrap items-center gap-2 pr-8 transition-opacity ${mine ? "justify-end" : "justify-start"} ${messageMenuId === msg.id ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}>
                    {messageMenuId === msg.id && (
                      <div className={`absolute bottom-8 z-20 w-56 max-w-[min(14rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface/95 p-2 shadow-xl backdrop-blur ${mine ? "right-0" : "left-0"}`}>
                        <div className="mb-2 flex flex-wrap gap-1 border-b border-border pb-2">
                          {MESSAGE_REACTIONS.map((emoji) => (
                            <button key={`${msg.id}-${emoji}`} type="button" className="rounded-full border border-transparent px-2 py-1 text-base transition hover:border-border hover:bg-muted" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                          ))}
                        </div>
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
      <form
        className="flex gap-2 rounded-2xl border border-border bg-input p-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = text.trim();
          if (!trimmed || sendingRef.current) return;
          sendingRef.current = true;
          setSendError(null);
          try {
            const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: trimmed }),
            });
            const payload = await res.json().catch(() => ({}));
            if (res.ok && payload.message) {
              setMessages((prev) => mergeMessagesById(prev, [payload.message as GroupMessageEntry]));
              setText("");
            } else {
              setSendError(typeof payload.error === "string" ? payload.error : "No se pudo enviar el mensaje");
            }
          } finally {
            sendingRef.current = false;
          }
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="flex-1 rounded-full bg-background/70 px-4 py-2 text-sm outline-none"
          placeholder="Escribe un mensaje"
        />
        <button type="submit" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
          Enviar
        </button>
      </form>
      {sendError && <p className="text-xs text-rose-400">{sendError}</p>}
    </div>
  );
}
