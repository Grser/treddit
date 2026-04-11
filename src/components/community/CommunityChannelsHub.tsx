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
  allowedRoleIds: number[];
  listeners: VoiceListener[];
};
type CommunityRole = {
  id: number;
  name: string;
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
  const [newAllowedRoleIds, setNewAllowedRoleIds] = useState<number[]>([]);
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<"audio" | "camera" | "screen" | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAllowedRoleIds, setEditingAllowedRoleIds] = useState<number[]>([]);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const refreshChannels = useCallback(async () => {
    if (!canInteract) return;
    const res = await fetch(`/api/communities/${communityId}/voice-channels`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as { channels?: Channel[]; roles?: CommunityRole[]; error?: string } | null;
    if (!res.ok) {
      throw new Error(payload?.error || "No se pudo cargar las salas de voz");
    }
    const nextChannels = Array.isArray(payload?.channels) ? payload.channels : [];
    setChannels(nextChannels);
    setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
    if (joinedVoiceId && !nextChannels.some((channel) => channel.id === joinedVoiceId)) {
      setJoinedVoiceId(null);
    }
  }, [canInteract, communityId, joinedVoiceId]);

  useEffect(() => () => {
    micStream?.getTracks().forEach((track) => track.stop());
    cameraStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream, micStream, screenStream]);

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
        body: JSON.stringify({ action: "create", name, allowedRoleIds: newAllowedRoleIds }),
      });
      const payload = (await res.json().catch(() => null)) as { channels?: Channel[]; roles?: CommunityRole[]; error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo crear la sala");
      }
      setChannels(Array.isArray(payload?.channels) ? payload.channels : []);
      setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
      setNewVoiceChannel("");
      setNewAllowedRoleIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sala");
    } finally {
      setBusy(false);
    }
  }

  async function updateVoiceChannel() {
    if (!editingChannelId || !editingName.trim() || busy || !canCreate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${communityId}/voice-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          channelId: editingChannelId,
          name: editingName.trim(),
          allowedRoleIds: editingAllowedRoleIds,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { channels?: Channel[]; roles?: CommunityRole[]; error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo editar la sala");
      }
      setChannels(Array.isArray(payload?.channels) ? payload.channels : []);
      setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
      setIsEditing(false);
      setEditingChannelId(null);
      setEditingName("");
      setEditingAllowedRoleIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar la sala");
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
      setJoinedVoiceId((prev) => {
        const leaving = prev === channelId;
        if (leaving) {
          micStream?.getTracks().forEach((track) => track.stop());
          cameraStream?.getTracks().forEach((track) => track.stop());
          screenStream?.getTracks().forEach((track) => track.stop());
          setActiveMedia(null);
        }
        return leaving ? null : channelId;
      });
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
  const joinedChannel = useMemo(() => channels.find((channel) => channel.id === joinedVoiceId) || null, [channels, joinedVoiceId]);

  function toggleArrayRole(roleId: number, setter: (next: number[]) => void, source: number[]) {
    setter(source.includes(roleId) ? source.filter((id) => id !== roleId) : [...source, roleId]);
  }

  async function toggleMedia(mode: "audio" | "camera" | "screen") {
    if (!joinedVoiceId) return;
    if (activeMedia === mode) {
      if (mode === "audio") micStream?.getTracks().forEach((track) => track.stop());
      if (mode === "camera") cameraStream?.getTracks().forEach((track) => track.stop());
      if (mode === "screen") screenStream?.getTracks().forEach((track) => track.stop());
      setActiveMedia(null);
      setMediaError(null);
      return;
    }
    setMediaError(null);
    try {
      if (mode === "audio") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStream?.getTracks().forEach((track) => track.stop());
        setMicStream(stream);
      }
      if (mode === "camera") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        cameraStream?.getTracks().forEach((track) => track.stop());
        setCameraStream(stream);
      }
      if (mode === "screen") {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStream?.getTracks().forEach((track) => track.stop());
        setScreenStream(stream);
      }
      setActiveMedia(mode);
    } catch {
      setMediaError("No se pudo activar el micrófono/cámara/pantalla. Revisa permisos del navegador.");
    }
  }

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
                {channel.allowedRoleIds.length > 0 ? <p className="text-[11px] text-amber-200/80">Sala restringida por roles</p> : null}
                {canCreate ? (
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-border/70 px-2.5 py-0.5 text-[11px]"
                    onClick={() => {
                      setIsEditing(true);
                      setEditingChannelId(channel.id);
                      setEditingName(channel.name);
                      setEditingAllowedRoleIds(channel.allowedRoleIds || []);
                    }}
                  >
                    Editar sala
                  </button>
                ) : null}
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
        {canCreate && roles.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[11px] opacity-70">Acceso:</span>
            <button
              type="button"
              onClick={() => setNewAllowedRoleIds([])}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${newAllowedRoleIds.length === 0 ? "border-emerald-300/60 text-emerald-200" : "border-border/70"}`}
            >
              Todos
            </button>
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleArrayRole(role.id, setNewAllowedRoleIds, newAllowedRoleIds)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${newAllowedRoleIds.includes(role.id) ? "border-emerald-300/60 text-emerald-200" : "border-border/70"}`}
              >
                {role.name}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      {joinedVoiceId && (
        <article className="mt-3 rounded-2xl border border-border/80 bg-background/40 p-3">
          <p className="text-xs uppercase tracking-wide opacity-70">En tu sala</p>
          <p className="mt-1 text-[11px] opacity-70">{joinedChannel?.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void toggleMedia("audio")} className="rounded-full border border-border/70 px-3 py-1 text-xs">
              {activeMedia === "audio" ? "Detener micro" : "Entrar llamada"}
            </button>
            <button type="button" onClick={() => void toggleMedia("camera")} className="rounded-full border border-border/70 px-3 py-1 text-xs">
              {activeMedia === "camera" ? "Detener cámara" : "Compartir cámara"}
            </button>
            <button type="button" onClick={() => void toggleMedia("screen")} className="rounded-full border border-border/70 px-3 py-1 text-xs">
              {activeMedia === "screen" ? "Detener pantalla" : "Compartir pantalla"}
            </button>
          </div>
          {mediaError ? <p className="mt-2 text-xs text-rose-300">{mediaError}</p> : null}
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

      {isEditing ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold">Editar sala de voz</p>
            <input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="mt-3 w-full rounded-lg border border-border bg-input px-2.5 py-2 text-sm" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setEditingAllowedRoleIds([])} className={`rounded-full border px-2 py-0.5 text-[11px] ${editingAllowedRoleIds.length === 0 ? "border-emerald-300/60 text-emerald-200" : "border-border/70"}`}>Todos</button>
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleArrayRole(role.id, setEditingAllowedRoleIds, editingAllowedRoleIds)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${editingAllowedRoleIds.includes(role.id) ? "border-emerald-300/60 text-emerald-200" : "border-border/70"}`}
                >
                  {role.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-border px-3 py-1 text-xs">Cancelar</button>
              <button type="button" onClick={() => void updateVoiceChannel()} className="rounded-full border border-emerald-300/60 px-3 py-1 text-xs text-emerald-200">Guardar</button>
            </div>
          </div>
        </div>
      ) : null}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
