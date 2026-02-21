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
      return filteredEntries.filter((entry) => {
        const label = `${entry.nickname || ""} ${entry.username}`.toLowerCase();
        return label.includes("grupo") || label.includes("group");
      });
    }
    return filteredEntries;
  }, [filteredEntries, tab]);

  return (
    <>
      <div className="border-b border-border/80 bg-background/70 px-4 py-4 backdrop-blur">
        <h1 className="text-2xl font-semibold">Chats</h1>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          placeholder="Buscar chat o iniciar uno nuevo"
          className="mt-3 w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand"
          aria-label="Buscar contactos"
        />
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={() => setTab("all")} className={`rounded-full border px-3 py-1.5 ${tab === "all" ? "border-brand bg-brand/20" : "border-border"}`}>Todos</button>
          <button type="button" onClick={() => setTab("unread")} className={`rounded-full border px-3 py-1.5 ${tab === "unread" ? "border-brand bg-brand/20" : "border-border"}`}>No leídos</button>
          <button type="button" onClick={() => setTab("groups")} className={`rounded-full border px-3 py-1.5 ${tab === "groups" ? "border-brand bg-brand/20" : "border-border"}`}>Grupos</button>
        </div>
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

            return (
              <li key={item.userId}>
                <Link
                  href={`/mensajes/${item.username}`}
                  className={`flex items-center gap-3 border-b border-border/60 px-4 py-3 transition ${isActive ? "bg-brand/10" : "hover:bg-background/60"}`}
                >
                  <Image
                    src={avatar}
                    alt={displayName}
                    width={52}
                    height={52}
                    className="size-12 rounded-full object-cover ring-1 ring-border"
                    unoptimized
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="line-clamp-1 font-semibold">{displayName}</span>
                      <UserBadges size="sm" isAdmin={item.is_admin} isVerified={item.is_verified} />
                      <span className="ml-auto text-xs opacity-60">{item.isStarter ? "Nuevo" : getCompactTime(item.createdAt)}</span>
                    </div>
                    <p className={`line-clamp-1 text-sm ${unread ? "font-semibold" : "opacity-70"}`}>
                      {item.isStarter ? "" : isMine ? "Tú: " : ""}
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
