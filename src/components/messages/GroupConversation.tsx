"use client";

import { useEffect, useRef, useState } from "react";

import type { GroupMessageEntry } from "@/lib/messages";

export default function GroupConversation({ groupId, viewerId, initialMessages }: { groupId: number; viewerId: number; initialMessages: GroupMessageEntry[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const latestIdRef = useRef(initialMessages[initialMessages.length - 1]?.id ?? 0);

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
      <ul className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background/40 p-3">
        {messages.map((msg) => {
          const mine = msg.senderId === viewerId;
          return (
            <li key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] rounded-xl px-4 py-2 text-sm ${mine ? "bg-brand text-white" : "bg-surface"}`}>
                {!mine && <p className="text-[11px] font-semibold opacity-70">{msg.sender.nickname || msg.sender.username}</p>}
                <p>{msg.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = text.trim();
          if (!trimmed) return;
          const res = await fetch(`/api/messages/groups/${groupId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: trimmed }),
          });
          const payload = await res.json().catch(() => ({}));
          if (res.ok && payload.message) {
            setMessages((prev) => [...prev, payload.message as GroupMessageEntry]);
            setText("");
          }
        }}
      >
        <input value={text} onChange={(event) => setText(event.target.value)} className="flex-1 rounded-full border border-border bg-input px-4 py-2 text-sm" placeholder="Mensaje al grupo" />
        <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm text-background">Enviar</button>
      </form>
    </div>
  );
}
