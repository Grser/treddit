"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import UserBadges from "@/components/UserBadges";
import type { InboxEntry } from "@/lib/inbox";
import { getCompactTime } from "@/lib/time";

type InboxListProps = {
  entries: InboxEntry[];
  currentUserId: number;
  activeUsername?: string;
  className?: string;
};

export default function InboxList({ entries, currentUserId, activeUsername, className }: InboxListProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [groupError, setGroupError] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return entries;
    return entries.filter((entry) => {
      const haystack = [entry.username, entry.nickname || "", entry.lastMessage || ""].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [entries, normalizedQuery]);

  const visibleEntries = useMemo(() => {
    if (tab === "unread") return filteredEntries.filter((entry) => entry.unreadCount > 0);
    if (tab === "groups") {
      return filteredEntries.filter((entry) => entry.type === "group");
    }
    return filteredEntries;
  }, [filteredEntries, tab]);

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
            <p className="mt-1 text-xs opacity-70">Crea una sala, agrega usuarios por nombre y empieza a chatear.</p>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none"
              placeholder="Nombre del grupo"
            />
            <input
              value={groupMembers}
              onChange={(event) => setGroupMembers(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-xs outline-none"
              placeholder="Usuarios: ana,carlos,luis"
            />
            {groupError && <p className="mt-2 text-xs text-red-500">{groupError}</p>}
            <button
              type="button"
              className="mt-2 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-brand/40"
              onClick={async () => {
                setGroupError(null);
                const usernames = groupMembers
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
                const res = await fetch("/api/messages/groups", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: groupName, memberUsernames: usernames }),
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
        )}
      </div>

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
              <li key={item.userId}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 border-b border-border/80 px-4 py-3 transition ${isActive ? "bg-brand/10" : "hover:bg-background/70"}`}
                >
                  {isGroup ? (
                    <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-xl ring-1 ring-emerald-500/40">👥</div>
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
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
