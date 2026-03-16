"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = {
  id: number;
  message: string;
  created_at: string;
  user: {
    id: number;
    username: string;
    nickname: string | null;
  };
};

type ChatResponse = {
  items?: ChatMessage[];
  error?: string;
};

function buildMessagesKey(items: ChatMessage[]) {
  return items.map((item) => `${item.id}:${item.created_at}`).join("|");
}

export default function CommunityChat({
  communityId,
  canInteract,
  canWrite,
}: {
  communityId: number;
  canInteract: boolean;
  canWrite: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let lastKey = "";

    async function pullMessages() {
      try {
        const res = await fetch(`/api/communities/${communityId}/chat`, { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as ChatResponse | null;
        if (!res.ok) {
          if (mounted) {
            setError(payload?.error || "No se pudo cargar el chat");
          }
          return;
        }
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        const nextKey = buildMessagesKey(nextItems);
        if (mounted && nextKey !== lastKey) {
          setMessages(nextItems);
          lastKey = nextKey;
        }
      } catch {
        if (mounted) {
          setError("Error de red al cargar mensajes");
        }
      }
    }

    void pullMessages();
    const id = setInterval(pullMessages, 3000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [communityId]);

  const canSend = canInteract && canWrite;
  const hint = useMemo(() => {
    if (!canInteract) return "Inicia sesión para participar en el chat.";
    if (!canWrite) return "Únete a la comunidad para enviar mensajes.";
    return "";
  }, [canInteract, canWrite]);

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || !canSend) return;
    const message = text.trim().slice(0, 500);
    if (!message) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/communities/${communityId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await res.json().catch(() => null)) as ChatResponse | null;
      if (!res.ok) {
        setError(payload?.error || "No se pudo enviar");
        return;
      }
      setText("");
      const refresh = await fetch(`/api/communities/${communityId}/chat`, { cache: "no-store" });
      if (refresh.ok) {
        const refreshed = (await refresh.json().catch(() => null)) as ChatResponse | null;
        setMessages(Array.isArray(refreshed?.items) ? refreshed.items : []);
      }
    } catch {
      setError("Error de red al enviar el mensaje");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Chat en tiempo real</h2>
      <p className="mt-1 text-xs text-foreground/70">Actualización automática cada 3 segundos.</p>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/60 p-3">
        {messages.length > 0 ? (
          messages.map((item) => (
            <article key={item.id} className="rounded-lg border border-border/50 bg-surface p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-foreground/80">
                  {item.user.nickname || item.user.username}
                </p>
                <time className="text-[11px] text-foreground/60">
                  {new Date(item.created_at).toLocaleTimeString()}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.message}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-foreground/60">Todavía no hay mensajes en este chat.</p>
        )}
      </div>

      <form onSubmit={sendMessage} className="mt-3 space-y-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={canSend ? "Escribe un mensaje para la comunidad" : hint}
          maxLength={500}
          disabled={!canSend || loading}
          className="h-20 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none ring-brand/30 focus:ring"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-foreground/60">{text.length}/500</span>
          <button
            type="submit"
            disabled={!canSend || loading}
            className="rounded-full bg-brand px-4 py-2 text-sm text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
