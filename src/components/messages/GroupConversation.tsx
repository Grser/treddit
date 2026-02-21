"use client";

import { useEffect, useRef, useState } from "react";

import type { GroupMessageEntry } from "@/lib/messages";

type GroupMember = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

type SearchUser = {
  id: number;
  username: string;
  nickname: string | null;
};

export default function GroupConversation({ groupId, viewerId, initialMessages, initialGroup }: { groupId: number; viewerId: number; initialMessages: GroupMessageEntry[]; initialGroup: { name: string; description: string | null; avatar_url: string | null; members: GroupMember[] } }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const latestIdRef = useRef(initialMessages[initialMessages.length - 1]?.id ?? 0);
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState(initialGroup.name);
  const [description, setDescription] = useState(initialGroup.description || "");
  const [avatarUrl, setAvatarUrl] = useState(initialGroup.avatar_url || "");
  const [members, setMembers] = useState<GroupMember[]>(initialGroup.members || []);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/messages/groups/${groupId}/messages?afterId=${latestIdRef.current}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!Array.isArray(payload.messages) || payload.messages.length === 0) return;
      setMessages((prev) => [...prev, ...(payload.messages as GroupMessageEntry[])]);
    }, 1500);
    return () => clearInterval(id);
  }, [groupId]);

  useEffect(() => {
    latestIdRef.current = messages[messages.length - 1]?.id ?? 0;
  }, [messages]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl border border-border/80 px-3 py-2 text-sm">
        <div>
          <p className="font-semibold">{name}</p>
          {description && <p className="text-xs opacity-70">{description}</p>}
        </div>
        <button type="button" onClick={() => setShowSettings((prev) => !prev)} className="rounded-full border border-border px-3 py-1 text-xs">Editar grupo</button>
      </div>
      {showSettings && (
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Personalización del grupo</p>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" placeholder="Nombre" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" placeholder="Descripción" />
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
                        throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo subir la imagen");
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
                <button type="button" className="rounded-full border border-border px-3 py-1.5 text-xs" onClick={() => setAvatarUrl("")}>Quitar</button>
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
              const res = await fetch(`/api/users/search?q=${encodeURIComponent(value.trim())}`, { cache: "no-store" });
              const payload = await res.json().catch(() => ({}));
              const memberIds = new Set(members.map((member) => member.id));
              const results = Array.isArray(payload.items) ? (payload.items as SearchUser[]) : [];
              setUserResults(results.filter((item) => !memberIds.has(item.id)));
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

          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="rounded-full border border-border px-2 py-1 text-xs"
                onClick={async () => {
                  if (member.id === viewerId) return;
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
                {member.nickname || member.username} {member.id === viewerId ? "(tú)" : "×"}
              </button>
            ))}
          </div>

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
                } else {
                  setSettingsError(typeof payload.error === "string" ? payload.error : "No se pudo guardar el grupo");
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
          {settingsError && <p className="mt-2 text-xs text-rose-400">{settingsError}</p>}
        </div>
      )}
      <ul className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border bg-[#0b141a] p-3">
        {messages.map((msg) => {
          const mine = msg.senderId === viewerId;
          return (
            <li key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? "bg-emerald-700 text-white" : "bg-[#202c33] text-slate-100"}`}>
                {!mine && <p className="text-[11px] font-semibold text-emerald-300">{msg.sender.nickname || msg.sender.username}</p>}
                <p className="whitespace-pre-wrap">{msg.text}</p>
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
          if (!trimmed) return;
          setSendError(null);
          const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: trimmed }),
          });
          const payload = await res.json().catch(() => ({}));
          if (res.ok && payload.message) {
            setMessages((prev) => [...prev, payload.message as GroupMessageEntry]);
            setText("");
          } else {
            setSendError(typeof payload.error === "string" ? payload.error : "No se pudo enviar el mensaje");
          }
        }}
      >
        <input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded-full bg-background/70 px-4 py-2 text-sm outline-none" placeholder="Escribe un mensaje" />
        <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Enviar</button>
      </form>
      {sendError && <p className="text-xs text-rose-400">{sendError}</p>}
    </div>
  );
}
