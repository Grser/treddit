"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import UserBadges from "@/components/UserBadges";
import type { InboxEntry } from "@/lib/inbox";
import { getCompactTime } from "@/lib/time";

type SearchUser = {
  id: number;
  username: string;
  nickname: string | null;
};

type InboxListProps = {
  entries: InboxEntry[];
  currentUserId: number;
  activeUsername?: string;
  className?: string;
};

export default function InboxList({ entries, currentUserId, activeUsername, className }: InboxListProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [searchStarters, setSearchStarters] = useState<InboxEntry[]>([]);

  const orderedEntries = useMemo(() => {
    return [...entries].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return left.userId - right.userId;
    });
  }, [entries]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return orderedEntries;
    return orderedEntries.filter((entry) => {
      const haystack = [entry.username, entry.nickname || "", entry.lastMessage || ""].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [orderedEntries, normalizedQuery]);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setSearchStarters([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/starters?q=${encodeURIComponent(normalizedQuery)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          setSearchStarters([]);
          return;
        }
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload.items) ? (payload.items as InboxEntry[]) : [];
        setSearchStarters(items);
      } catch {
        setSearchStarters([]);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  const combinedEntries = useMemo(() => {
    if (!normalizedQuery) return filteredEntries;
    const existingConversationUserIds = new Set(
      entries.filter((entry) => !entry.isStarter && entry.type !== "group").map((entry) => entry.userId),
    );
    const byUserId = new Map(filteredEntries.map((entry) => [entry.userId, entry]));
    for (const starter of searchStarters) {
      if (existingConversationUserIds.has(starter.userId)) continue;
      if (!byUserId.has(starter.userId)) {
        byUserId.set(starter.userId, starter);
      }
    }

    return Array.from(byUserId.values()).sort((left, right) => {
      if (left.isStarter && !right.isStarter) return 1;
      if (!left.isStarter && right.isStarter) return -1;
      if (left.isStarter && right.isStarter) {
        return (left.nickname || left.username).localeCompare(right.nickname || right.username, "es");
      }
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    });
  }, [entries, filteredEntries, normalizedQuery, searchStarters]);

  const visibleEntries = useMemo(() => {
    if (tab === "groups") {
      return combinedEntries.filter((entry) => entry.type === "group");
    }
    if (tab === "unread") {
      return combinedEntries.filter((entry) => entry.unreadCount > 0);
    }
    return combinedEntries;
  }, [combinedEntries, tab]);

  async function removeConversation(username: string) {
    const confirmDelete = window.confirm("¿Eliminar este chat de tu lista? Podrás volver a escribirle cuando quieras.");
    if (!confirmDelete) return;
    setDeletingUsername(username);
    try {
      const res = await fetch(`/api/messages/conversation/${encodeURIComponent(username)}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = typeof payload.error === "string" ? payload.error : "No se pudo borrar el chat";
        throw new Error(message);
      }
      window.location.href = "/mensajes";
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo borrar el chat";
      window.alert(message);
    } finally {
      setDeletingUsername(null);
    }
  }

  async function searchPeople(value: string) {
    setMemberQuery(value);
    if (value.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(value.trim())}`, { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    const items = Array.isArray(payload.items) ? (payload.items as SearchUser[]) : [];
    const selectedSet = new Set(selectedMembers.map((user) => user.id));
    setMemberResults(items.filter((item) => item.id !== currentUserId && !selectedSet.has(item.id)));
  }

  return (
    <>
      <div className="border-b border-border/80 bg-surface px-4 py-4">
        <h1 className="text-3xl font-semibold text-foreground">Chats</h1>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          placeholder="Buscar chat o iniciar uno nuevo"
          className="mt-3 w-full rounded-full border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-brand"
          aria-label="Buscar contactos"
        />
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={() => setTab("all")} className={`rounded-full border px-3 py-1.5 transition ${tab === "all" ? "border-brand bg-brand/20 text-foreground" : "border-border text-foreground/80 hover:bg-background/70"}`}>Todos</button>
          <button type="button" onClick={() => setTab("unread")} className={`rounded-full border px-3 py-1.5 transition ${tab === "unread" ? "border-brand bg-brand/20 text-foreground" : "border-border text-foreground/80 hover:bg-background/70"}`}>No leídos</button>
          <button type="button" onClick={() => setTab("groups")} className={`rounded-full border px-3 py-1.5 transition ${tab === "groups" ? "border-brand bg-brand/20 text-foreground" : "border-border text-foreground/80 hover:bg-background/70"}`}>Grupos</button>
        </div>
        {tab === "groups" && (
          <div className="mt-3 rounded-2xl border border-border/80 bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand/90">Nuevo grupo</p>
            <p className="mt-1 text-xs opacity-70">Como WhatsApp/Instagram: elige personas desde un selector visual.</p>
            <button type="button" onClick={() => setShowCreateGroup(true)} className="mt-2 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white">
              Abrir selector
            </button>
          </div>
        )}
      </div>

      {showCreateGroup && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Crear grupo</h2>
              <button onClick={() => setShowCreateGroup(false)} className="text-sm opacity-70">Cerrar</button>
            </div>
            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Nombre del grupo" className="mt-3 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none" />
            <input value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Descripción (opcional)" className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none" />
            <input value={memberQuery} onChange={(event) => void searchPeople(event.target.value)} placeholder="Buscar personas" className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none" />

            {selectedMembers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <button key={member.id} type="button" onClick={() => setSelectedMembers((prev) => prev.filter((item) => item.id !== member.id))} className="rounded-full border border-brand/30 bg-brand/15 px-2 py-1 text-xs">
                    {(member.nickname || member.username)} ×
                  </button>
                ))}
              </div>
            )}

            {memberResults.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border/70">
                {memberResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMembers((prev) => [...prev, item]);
                        setMemberQuery("");
                        setMemberResults([]);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background/70"
                    >
                      <span>{item.nickname || item.username}</span>
                      <span className="text-xs opacity-70">@{item.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {groupError && <p className="mt-2 text-xs text-red-500">{groupError}</p>}
            <button
              type="button"
              className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
              onClick={async () => {
                setGroupError(null);
                const res = await fetch("/api/messages/groups", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: groupName,
                    description: groupDescription,
                    memberIds: selectedMembers.map((member) => member.id),
                  }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok || !payload.groupId) {
                  setGroupError(typeof payload.error === "string" ? payload.error : "No se pudo crear");
                  return;
                }
                window.location.href = `/mensajes/grupos/${payload.groupId}`;
              }}
            >
              Crear grupo
            </button>
          </div>
        </div>
      )}

      {visibleEntries.length === 0 ? (
        <div className="p-4 text-sm opacity-70">
          {entries.length === 0
            ? "Aún no tienes mensajes nuevos. ¡Participa en las conversaciones para recibir respuestas!"
            : "No encontramos contactos con ese término."}
        </div>
      ) : (
        <ul className={className || "h-[calc(100dvh-18rem)] min-h-[360px] overflow-y-auto"}>
          {visibleEntries.map((item) => {
            const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
            const displayName = item.nickname || item.username;
            const preview = item.isStarter ? "Síguense mutuamente · toca para iniciar chat" : item.lastMessage?.trim() || "Archivo adjunto";
            const unread = item.unreadCount > 0;
            const isMine = item.lastSenderId === currentUserId;
            const isActive = activeUsername === item.username;
            const href = item.type === "group" && item.groupId ? `/mensajes/grupos/${item.groupId}` : `/mensajes/${item.username}`;
            const isGroup = item.type === "group";

            return (
              <li key={item.userId} className="group relative">
                <Link
                  href={href}
                  className={`flex items-center gap-3 border-b border-border/80 px-4 py-3 pr-14 transition ${isActive ? "bg-brand/10" : "hover:bg-background/70"}`}
                >
                  {isGroup ? (
                    item.avatar_url ? (
                      <Image src={avatar} alt={displayName} width={52} height={52} className="size-12 rounded-full object-cover ring-1 ring-border" unoptimized />
                    ) : <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-xl ring-1 ring-emerald-500/40">👥</div>
                  ) : (
                    <Image
                      src={avatar}
                      alt={displayName}
                      width={52}
                      height={52}
                      className="size-12 rounded-full object-cover ring-1 ring-border"
                      unoptimized
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="line-clamp-1 font-semibold">{displayName}</span>
                      {!isGroup && <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />}
                      <span className="ml-auto text-xs opacity-60">{item.isStarter ? "Nuevo" : getCompactTime(item.createdAt)}</span>
                    </div>
                    <p className={`line-clamp-1 text-sm ${unread ? "font-semibold" : "opacity-70"}`}>
                      {isGroup ? "Grupo · " : item.isStarter ? "" : isMine ? "Tú: " : ""}
                      {preview}
                    </p>
                    {item.isStarter && (
                      <p className="text-xs font-medium text-brand/90">Contacto disponible para nuevo chat</p>
                    )}
                  </div>
                  {unread && (
                    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </span>
                  )}
                </Link>
                {!isGroup && !item.isStarter && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void removeConversation(item.username);
                    }}
                    disabled={deletingUsername === item.username}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/80 bg-surface px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                    aria-label={`Eliminar chat con ${displayName}`}
                  >
                    {deletingUsername === item.username ? "..." : "Borrar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
