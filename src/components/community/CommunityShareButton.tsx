"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type ShareTarget = {
  type: "direct" | "group";
  id: number;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
};

export default function CommunityShareButton({
  communitySlug,
  communityName,
  canInteract,
}: {
  communitySlug: string;
  communityName: string;
  canInteract: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [selected, setSelected] = useState<Record<string, ShareTarget>>({});

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return targets;
    return targets.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(text));
  }, [query, targets]);

  function buildText() {
    const url = new URL(`/c/${communitySlug}`, window.location.origin).toString();
    const intro = message.trim() || `Te invitaron a la comunidad ${communityName}`;
    return `${intro}\n${url}`;
  }

  async function openModal() {
    if (!canInteract) {
      alert("Inicia sesión para compartir");
      return;
    }
    setOpen(true);
    setSelected({});
    setMessage("");
    setQuery("");
    setLoading(true);
    try {
      const res = await fetch("/api/messages/share-targets", { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as { items?: ShareTarget[] };
      setTargets(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleTarget(target: ShareTarget) {
    const key = `${target.type}-${target.id}`;
    setSelected((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: target };
    });
  }

  async function submitShare() {
    const selectedTargets = Object.values(selected);
    if (!selectedTargets.length || sending) return;

    setSending(true);
    try {
      const text = buildText();
      for (const target of selectedTargets) {
        const endpoint = target.type === "group" ? `/api/messages/groups/${target.id}/messages` : "/api/messages";
        const payload = target.type === "group" ? { text } : { recipientId: target.id, text };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error("SHARE_FAILED");
        }
      }
      setOpen(false);
    } catch {
      alert("No se pudo compartir la comunidad");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
      >
        Compartir comunidad
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Compartir comunidad</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-2 py-1 text-sm hover:bg-muted/60">Cerrar</button>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar amigos o chats"
              className="mt-3 h-10 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none"
            />
            <div className="mt-3 max-h-52 space-y-2 overflow-auto rounded-xl border border-border p-2">
              {loading ? (
                <p className="p-2 text-sm opacity-70">Cargando chats...</p>
              ) : filtered.length === 0 ? (
                <p className="p-2 text-sm opacity-70">No hay destinos disponibles.</p>
              ) : (
                filtered.map((target) => {
                  const key = `${target.type}-${target.id}`;
                  const active = Boolean(selected[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleTarget(target)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-brand/15" : "hover:bg-muted/60"}`}
                    >
                      <span className="flex items-center gap-2">
                        {target.avatarUrl ? (
                          <Image
                            src={target.avatarUrl}
                            alt={target.title}
                            width={28}
                            height={28}
                            className="size-7 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                            {target.title.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span>
                          <strong>{target.title}</strong>
                          <span className="ml-2 opacity-70">{target.subtitle}</span>
                        </span>
                      </span>
                      {active ? "✓" : "+"}
                    </button>
                  );
                })
              )}
            </div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              placeholder="Mensaje opcional"
              className="mt-3 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={submitShare}
              disabled={sending || Object.keys(selected).length === 0}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm text-white disabled:opacity-50"
            >
              {sending ? "Compartiendo..." : "Enviar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
