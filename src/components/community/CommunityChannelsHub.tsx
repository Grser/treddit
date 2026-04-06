"use client";

import { useMemo, useState } from "react";

type Channel = {
  id: string;
  name: string;
  kind: "text" | "voice";
  topic?: string;
  listeners?: string[];
};

const SAMPLE_CHANNELS: Channel[] = [
  { id: "txt-anuncios", name: "anuncios", kind: "text", topic: "Novedades oficiales y avisos de moderación." },
  { id: "txt-general", name: "general", kind: "text", topic: "Conversación principal de la comunidad." },
  { id: "txt-media", name: "clips-y-memes", kind: "text", topic: "Comparte imágenes, clips y recomendaciones." },
  { id: "voice-lobby", name: "Sala principal", kind: "voice", listeners: ["Joaco_04", "Uw", "Kaxoli"] },
  { id: "voice-gaming", name: "Gaming nocturno", kind: "voice", listeners: ["Ian_torresXD1"] },
  { id: "voice-music", name: "Escucha musical", kind: "voice", listeners: [] },
];

export default function CommunityChannelsHub() {
  const [selectedChannelId, setSelectedChannelId] = useState("txt-general");
  const [joinedVoiceId, setJoinedVoiceId] = useState<string | null>(null);

  const selected = useMemo(
    () => SAMPLE_CHANNELS.find((channel) => channel.id === selectedChannelId) || SAMPLE_CHANNELS[1],
    [selectedChannelId],
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Canales estilo Discord</h2>
        <p className="mt-1 text-sm opacity-75">
          Organiza comunidades con canales de texto y voz: selecciona salas, mira quién está conectado y únete en un clic.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/80 bg-background/45 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide opacity-70">Canales de texto</p>
          <div className="space-y-1.5">
            {SAMPLE_CHANNELS.filter((channel) => channel.kind === "text").map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => setSelectedChannelId(channel.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${selectedChannelId === channel.id ? "border-brand/50 bg-brand/15" : "border-border/60 bg-background/60 hover:bg-muted"}`}
              >
                <span># {channel.name}</span>
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide opacity-70">Canales de voz</p>
          <div className="space-y-1.5">
            {SAMPLE_CHANNELS.filter((channel) => channel.kind === "voice").map((channel) => {
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
        </aside>

        <article className="rounded-2xl border border-border/80 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Canal activo</p>
          <h3 className="mt-1 text-lg font-semibold">
            {selected.kind === "text" ? "#" : "🔊"} {selected.name}
          </h3>
          {selected.kind === "text" ? (
            <>
              <p className="mt-2 text-sm opacity-80">{selected.topic}</p>
              <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-surface/70 p-3 text-xs">
                <p><span className="font-semibold">@Admin</span>: Recuerden usar #anuncios para novedades importantes.</p>
                <p><span className="font-semibold">@Uw</span>: ¿Abrimos sala de voz para jugar a las 22:00?</p>
                <p><span className="font-semibold">@Joaco_04</span>: Sí, entro a “Gaming nocturno” en 5 min.</p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm opacity-80">Sala de voz para entrar y hablar en tiempo real con la comunidad.</p>
              <div className="mt-3 rounded-xl border border-border/70 bg-surface/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Conectados</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected.listeners || []).length > 0 ? (
                    (selected.listeners || []).map((listener) => (
                      <span key={listener} className="rounded-full border border-border px-2 py-1 text-xs">{listener}</span>
                    ))
                  ) : (
                    <span className="text-xs opacity-70">Nadie conectado aún.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
