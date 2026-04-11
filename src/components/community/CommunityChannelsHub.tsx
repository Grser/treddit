"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type VoiceListener = {
  id: number;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
};

type Channel = {
  id: number;
  slug: string;
  name: string;
  listeners: VoiceListener[];
};

export default function CommunityChannelsHub({
  communityId,
  canCreate,
  canInteract,
}: {
  communityId: number;
  canCreate: boolean;
  canInteract: boolean;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [joinedVoiceId, setJoinedVoiceId] = useState<number | null>(null);
  const [newVoiceChannel, setNewVoiceChannel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshChannels = useCallback(async () => {
    if (!canInteract) return;
    const res = await fetch(`/api/communities/${communityId}/voice-channels`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as { channels?: Channel[]; error?: string } | null;
    if (!res.ok) {
      throw new Error(payload?.error || "No se pudo cargar las salas de voz");
    }
    const nextChannels = Array.isArray(payload?.channels) ? payload.channels : [];
    setChannels(nextChannels);
    if (joinedVoiceId && !nextChannels.some((channel) => channel.id === joinedVoiceId)) {
      setJoinedVoiceId(null);
    }
  }, [canInteract, communityId, joinedVoiceId]);

  useEffect(() => {
    let mounted = true;
    if (!canInteract) return;

    void refreshChannels().catch((err) => {
      if (mounted) setError(err instanceof Error ? err.message : "No se pudo cargar las salas");
    });

    const pollId = setInterval(() => {
      void refreshChannels().catch(() => undefined);
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(pollId);
    };
  }, [canInteract, refreshChannels]);

  useEffect(() => {
    if (!canInteract || !joinedVoiceId) return;
    const heartbeatId = setInterval(() => {
      void fetch(`/api/communities/${communityId}/voice-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", channelId: joinedVoiceId }),
      });
    }, 25000);

    return () => clearInterval(heartbeatId);
  }, [canInteract, communityId, joinedVoiceId]);

  async function createVoiceChannel() {
    const name = newVoiceChannel.trim();
    if (!name || busy || !canCreate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${communityId}/voice-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name }),
      });
      const payload = (await res.json().catch(() => null)) as { channels?: Channel[]; error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo crear la sala");
      }
      setChannels(Array.isArray(payload?.channels) ? payload.channels : []);
      setNewVoiceChannel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sala");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVoice(channelId: number) {
    if (busy || !canInteract) return;
    setBusy(true);
    setError(null);
    try {
      const action = joinedVoiceId === channelId ? "leave" : "join";
      const res = await fetch(`/api/communities/${communityId}/voice-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, channelId }),
      });
      const payload = (await res.json().catch(() => null)) as { channels?: Channel[]; error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo actualizar la conexión");
      }
      setChannels(Array.isArray(payload?.channels) ? payload.channels : []);
      setJoinedVoiceId((prev) => (prev === channelId ? null : channelId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar");
    } finally {
      setBusy(false);
    }
  }

  const joinedUsers = useMemo(
    () => channels.find((channel) => channel.id === joinedVoiceId)?.listeners || [],
    [channels, joinedVoiceId],
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Canales de voz</h2>
        <p className="mt-1 text-xs text-foreground/70">Conexión en vivo para llamadas, cámara y pantalla compartida.</p>
      </div>

      <article className="rounded-2xl border border-border/80 bg-background/45 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Salas activas</p>
        <div className="space-y-1.5">
          {channels.map((channel) => {
            const active = joinedVoiceId === channel.id;
            return (
              <div key={channel.id} className={`rounded-xl border px-3 py-2 text-sm ${active ? "border-emerald-300/50 bg-emerald-500/10" : "border-border/60 bg-background/60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p>🔊 {channel.name}</p>
                  <button
                    type="button"
                    onClick={() => void toggleVoice(channel.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${active ? "border-rose-300/60 text-rose-200" : "border-emerald-300/60 text-emerald-200"}`}
                    disabled={busy || !canInteract}
                  >
                    {active ? "Salir de sala" : "Unirme"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] opacity-70">{channel.listeners.length} conectados</p>
              </div>
            );
          })}
          {channels.length === 0 && <p className="text-xs opacity-70">No hay salas creadas todavía.</p>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={newVoiceChannel}
            onChange={(event) => setNewVoiceChannel(event.target.value)}
            placeholder={canCreate ? "nueva-sala" : "Solo admins/roles con permiso pueden crear"}
            className="w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs"
            disabled={!canCreate || busy}
          />
          <button onClick={() => void createVoiceChannel()} className="rounded-lg border border-border px-2.5 text-xs" disabled={!canCreate || busy}>+</button>
        </div>
      </article>

      {joinedVoiceId && (
        <article className="mt-3 rounded-2xl border border-border/80 bg-background/40 p-3">
          <p className="text-xs uppercase tracking-wide opacity-70">En tu sala</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {joinedUsers.map((user) => (
              <div key={user.id} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-xs">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.nickname || user.username} width={20} height={20} className="size-5 rounded-full object-cover" unoptimized />
                ) : (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px]">
                    {(user.nickname || user.username).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>{user.nickname || user.username}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
