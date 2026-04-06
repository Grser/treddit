"use client";

import { useMemo, useState } from "react";

type Channel = {
  id: string;
  name: string;
  kind: "text" | "voice";
  topic?: string;
  listeners?: string[];
};

const INITIAL_CHANNELS: Channel[] = [
  { id: "txt-general", name: "general", kind: "text", topic: "Conversación principal de la comunidad." },
  { id: "voice-lobby", name: "Sala principal", kind: "voice", listeners: [] },
];

export default function CommunityChannelsHub() {
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState("txt-general");
  const [joinedVoiceId, setJoinedVoiceId] = useState<string | null>(null);
  const [newTextChannel, setNewTextChannel] = useState("");
  const [newVoiceChannel, setNewVoiceChannel] = useState("");

  const selected = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) || channels[0],
    [channels, selectedChannelId],
  );

  function addChannel(kind: "text" | "voice") {
    const rawName = (kind === "text" ? newTextChannel : newVoiceChannel).trim().toLowerCase();
    if (!rawName) return;
    const id = `${kind}-${rawName.replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}`;
    const channel: Channel = kind === "text"
      ? { id, name: rawName, kind, topic: "Canal personalizado por administradores del grupo." }
      : { id, name: rawName, kind, listeners: [] };

    setChannels((prev) => [...prev, channel]);
    setSelectedChannelId(id);
    if (kind === "text") setNewTextChannel("");
    else setNewVoiceChannel("");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Canales de la comunidad</h2>
        <p className="mt-1 text-xs text-foreground/70">Todo organizado en un solo panel para texto y voz.</p>
      </div>

      <div className="space-y-4">
        <article className="rounded-2xl border border-border/80 bg-background/45 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Canales de texto</p>
          <div className="space-y-1.5">
            {channels.filter((channel) => channel.kind === "text").map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => setSelectedChannelId(channel.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${selectedChannelId === channel.id ? "border-brand/50 bg-brand/15 text-foreground" : "border-border/60 bg-background/60 text-foreground/85 hover:bg-muted"}`}
              >
                <span># {channel.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input value={newTextChannel} onChange={(event) => setNewTextChannel(event.target.value)} placeholder="nuevo-texto" className="w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs" />
            <button onClick={() => addChannel("text")} className="rounded-lg border border-border px-2.5 text-xs">+</button>
          </div>
        </article>

        <article className="rounded-2xl border border-border/80 bg-background/45 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Canales de voz</p>
          <div className="space-y-1.5">
            {channels.filter((channel) => channel.kind === "voice").map((channel) => {
              const listeners = channel.listeners || [];
              const active = joinedVoiceId === channel.id;
              return (
                <div key={channel.id} className={`rounded-xl border px-3 py-2 text-sm ${active ? "border-emerald-300/50 bg-emerald-500/10" : "border-border/60 bg-background/60"}`}>
                  <button type="button" onClick={() => setSelectedChannelId(channel.id)} className="w-full text-left">
                    🔊 {channel.name}
                  </button>
                  <p className="mt-1 text-[11px] opacity-70">{listeners.length} conectados</p>
                  <button
                    type="button"
                    onClick={() => setJoinedVoiceId((prev) => (prev === channel.id ? null : channel.id))}
                    className={`mt-2 rounded-full border px-3 py-1 text-xs ${active ? "border-rose-300/60 text-rose-200" : "border-emerald-300/60 text-emerald-200"}`}
                  >
                    {active ? "Salir de sala" : "Unirme"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input value={newVoiceChannel} onChange={(event) => setNewVoiceChannel(event.target.value)} placeholder="nueva-sala" className="w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs" />
            <button onClick={() => addChannel("voice")} className="rounded-lg border border-border px-2.5 text-xs">+</button>
          </div>
        </article>

        <article className="rounded-2xl border border-border/80 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Canal activo</p>
          {selected ? (
            <>
              <h3 className="mt-1 text-lg font-semibold">
                {selected.kind === "text" ? "#" : "🔊"} {selected.name}
              </h3>
              {selected.kind === "text" ? (
                <p className="mt-2 text-sm opacity-80">{selected.topic}</p>
              ) : (
                <p className="mt-2 text-sm opacity-80">Sala de voz lista para llamadas grupales en tiempo real.</p>
              )}
            </>
          ) : (
            <p className="text-sm opacity-70">No hay canales todavía.</p>
          )}
        </article>
      </div>
    </section>
  );
}
