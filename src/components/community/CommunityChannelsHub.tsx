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

const buttonTone = {
  idle: "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
  active: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
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
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAllowedRoleIds, setEditingAllowedRoleIds] = useState<number[]>([]);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const clearAllMedia = useCallback(() => {
    micStream?.getTracks().forEach((track) => track.stop());
    cameraStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
    setMicEnabled(false);
    setCameraEnabled(false);
    setScreenEnabled(false);
  }, [cameraStream, micStream, screenStream]);

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
      clearAllMedia();
    }
  }, [canInteract, clearAllMedia, communityId, joinedVoiceId]);

  useEffect(() => () => clearAllMedia(), [clearAllMedia]);

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
          clearAllMedia();
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

  async function toggleMic() {
    if (!joinedVoiceId) return;
    if (micEnabled) {
      micStream?.getTracks().forEach((track) => track.stop());
      setMicEnabled(false);
      setMediaError(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStream?.getTracks().forEach((track) => track.stop());
      setMicStream(stream);
      setMicEnabled(true);
      setMediaError(null);
    } catch {
      setMediaError("No se pudo activar el micrófono/cámara/pantalla. Revisa permisos del navegador.");
    }
  }

  async function toggleCamera() {
    if (!joinedVoiceId) return;
    if (cameraEnabled) {
      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraEnabled(false);
      setMediaError(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(stream);
      setCameraEnabled(true);
      setMediaError(null);
    } catch {
      setMediaError("No se pudo activar el micrófono/cámara/pantalla. Revisa permisos del navegador.");
    }
  }

  async function toggleScreen() {
    if (!joinedVoiceId) return;
    if (screenEnabled) {
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenEnabled(false);
      setMediaError(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(stream);
      setScreenEnabled(true);
      setMediaError(null);
    } catch {
      setMediaError("No se pudo activar el micrófono/cámara/pantalla. Revisa permisos del navegador.");
    }
  }

  return (
    <section className="rounded-2xl border border-[#2b3150] bg-[#0b1020] p-5 text-[#e7ebff] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Canales de voz</h2>
        <p className="mt-1 text-sm text-[#b4bddf]">Conexión en vivo para llamadas, cámara y pantalla compartida.</p>
      </div>

      {joinedVoiceId ? (
        <article className="mb-3 rounded-xl border border-white/10 bg-[#2d3140] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-emerald-400">Voice Connected</p>
              <p className="text-sm text-white/80">{joinedUsers[0]?.nickname || joinedUsers[0]?.username || "En llamada"} / {joinedChannel?.name}</p>
            </div>
            <p className="text-lg tracking-[0.2em] text-white/70">⎯⎯⎯</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <button type="button" onClick={() => void toggleMic()} className={`rounded-lg border px-3 py-2 text-sm ${micEnabled ? buttonTone.active : buttonTone.idle}`}>🎙️</button>
            <button type="button" onClick={() => void toggleScreen()} className={`rounded-lg border px-3 py-2 text-sm ${screenEnabled ? buttonTone.active : buttonTone.idle}`}>🖥️</button>
            <button type="button" onClick={() => void toggleCamera()} className={`rounded-lg border px-3 py-2 text-sm ${cameraEnabled ? buttonTone.active : buttonTone.idle}`}>📹</button>
            <button type="button" onClick={() => void toggleVoice(joinedVoiceId)} className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20">📞</button>
          </div>
        </article>
      ) : null}

      <article className="rounded-2xl border border-white/10 bg-[#0f162b] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#a9b2d3]">Salas activas</p>
        <div className="space-y-2">
          {channels.map((channel) => {
            const active = joinedVoiceId === channel.id;
            return (
              <div
                key={channel.id}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  active ? "border-emerald-300/50 bg-emerald-500/15" : "border-white/10 bg-[#171f35]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">🔊 {channel.name}</p>
                  <button
                    type="button"
                    onClick={() => void toggleVoice(channel.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${active ? "border-rose-300/60 text-rose-200" : "border-emerald-300/60 text-emerald-200"}`}
                    disabled={busy || !canInteract}
                  >
                    {active ? "Salir de sala" : "Unirme"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-white/70">{channel.listeners.length} conectados</p>
                {channel.allowedRoleIds.length > 0 ? <p className="text-[11px] text-amber-200/80">Sala restringida por roles</p> : null}
                {canCreate ? (
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-white/80"
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
          {channels.length === 0 && <p className="text-xs text-white/70">No hay salas creadas todavía.</p>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={newVoiceChannel}
            onChange={(event) => setNewVoiceChannel(event.target.value)}
            placeholder={canCreate ? "nueva-sala" : "Solo admins/roles con permiso pueden crear"}
            className="w-full rounded-lg border border-white/10 bg-[#1b2238] px-2.5 py-1.5 text-xs"
            disabled={!canCreate || busy}
          />
          <button onClick={() => void createVoiceChannel()} className="rounded-lg border border-white/20 px-2.5 text-xs" disabled={!canCreate || busy}>+</button>
        </div>
        {canCreate && roles.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[11px] text-white/70">Acceso:</span>
            <button
              type="button"
              onClick={() => setNewAllowedRoleIds([])}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${newAllowedRoleIds.length === 0 ? "border-emerald-300/60 text-emerald-200" : "border-white/20 text-white/80"}`}
            >
              Todos
            </button>
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleArrayRole(role.id, setNewAllowedRoleIds, newAllowedRoleIds)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${newAllowedRoleIds.includes(role.id) ? "border-emerald-300/60 text-emerald-200" : "border-white/20 text-white/80"}`}
              >
                {role.name}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      {joinedVoiceId ? (
        <article className="mt-3 rounded-2xl border border-white/10 bg-[#0f162b] p-3">
          <p className="text-xs uppercase tracking-wide text-white/60">En tu sala</p>
          <p className="mt-1 text-sm text-white/80">{joinedChannel?.name}</p>
          {mediaError ? <p className="mt-2 text-xs text-rose-300">{mediaError}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {joinedUsers.map((user) => (
              <div key={user.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1b2238] px-2 py-1 text-xs">
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
      ) : null}

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

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </section>
  );
}
