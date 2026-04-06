"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconMic, IconPhone, IconVideo } from "@/components/icons";

type CallMode = "audio" | "video";
type CallEventType = "started-audio" | "started-video" | "ended";
type CallPhase = "idle" | "outgoing" | "incoming" | "active";

type CallSignal = {
  type: "invite" | "accepted" | "rejected" | "ended" | "timeout";
  key?: string;
  mode?: CallMode;
  sender: string;
  createdAt: string;
};

type CallLogDetail = {
  key?: string;
  eventType: CallEventType;
  contactName: string;
  contextLabel: string;
  createdAt: string;
  summary: string;
};

const RING_TIMEOUT_MS = 15000;

export default function LocalCallControls({
  contactName = "Contacto",
  contextLabel = "Mensajes",
  chatLogKey,
}: {
  contactName?: string;
  contextLabel?: string;
  chatLogKey?: string;
}) {
  const [activeMode, setActiveMode] = useState<CallMode | null>(null);
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [incomingMode, setIncomingMode] = useState<CallMode | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const callChannelRef = useRef<BroadcastChannel | null>(null);
  const ringOscillatorsRef = useRef<Array<{ context: AudioContext; oscillators: OscillatorNode[]; gains: GainNode[] }>>([]);
  const ringingTimeoutRef = useRef<number | null>(null);

  const active = phase === "active" && activeMode !== null;

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const channel = new BroadcastChannel("treddit-call-signals");
    callChannelRef.current = channel;

    const onMessage = (event: MessageEvent<CallSignal>) => {
      const signal = event.data;
      if (!signal || signal.key !== chatLogKey) return;
      if (signal.sender === contactName) return;

      if (signal.type === "invite" && phase === "idle") {
        setIncomingMode(signal.mode ?? "audio");
        setPhase("incoming");
        setNotice(`Llamada entrante de ${contactName}`);
        startClassicRingTone();
      } else if (signal.type === "accepted" && phase === "outgoing") {
        stopClassicRingTone();
        clearRingingTimeout();
        void startMediaCall(signal.mode ?? activeMode ?? "audio", true);
      } else if ((signal.type === "rejected" || signal.type === "timeout") && phase === "outgoing") {
        stopClassicRingTone();
        clearRingingTimeout();
        setPhase("idle");
        setNotice("La otra persona no aceptó la llamada.");
      } else if (signal.type === "ended") {
        stopClassicRingTone();
        clearRingingTimeout();
        internalEndCall(false);
      }
    };

    channel.addEventListener("message", onMessage as EventListener);
    return () => {
      channel.removeEventListener("message", onMessage as EventListener);
      channel.close();
      callChannelRef.current = null;
    };
  }, [activeMode, chatLogKey, contactName, phase]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => () => {
    stopClassicRingTone();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearRingingTimeout();
  }, []);

  useEffect(() => {
    if (!isLauncherOpen) return undefined;

    function handleClickOutside(event: MouseEvent) {
      if (!launcherRef.current) return;
      if (launcherRef.current.contains(event.target as Node)) return;
      setIsLauncherOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsLauncherOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isLauncherOpen]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    if (!streamRef.current || !active) {
      audioElement.srcObject = null;
      return;
    }
    audioElement.srcObject = streamRef.current;
    audioElement.muted = !monitorEnabled;
    const playPromise = audioElement.play();
    if (playPromise) {
      playPromise.catch(() => {
        setError("No se pudo reproducir el monitor de audio local. Toca el botón de monitor para reintentar.");
      });
    }
  }, [active, monitorEnabled]);

  const elapsedText = useMemo(
    () => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds],
  );

  function dispatchCallEvent(eventType: CallEventType, summary: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<CallLogDetail>("treddit-call-log", {
        detail: {
          key: chatLogKey,
          eventType,
          contactName,
          contextLabel,
          createdAt: new Date().toISOString(),
          summary,
        },
      }),
    );
  }

  function emitSignal(signal: Omit<CallSignal, "sender" | "createdAt">) {
    callChannelRef.current?.postMessage({ ...signal, sender: contactName, createdAt: new Date().toISOString() });
  }

  function clearRingingTimeout() {
    if (ringingTimeoutRef.current) {
      window.clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
  }

  function startClassicRingTone() {
    if (typeof window === "undefined") return;
    stopClassicRingTone();
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const schedule = [440, 523.25];
    const cycle = 2.6;

    schedule.forEach((frequency, idx) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.0001, context.currentTime);

      for (let i = 0; i < 8; i += 1) {
        const start = context.currentTime + i * cycle + idx * 0.28;
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
      }

      osc.start();
      oscillators.push(osc);
      gains.push(gain);
    });

    ringOscillatorsRef.current.push({ context, oscillators, gains });
  }

  function stopClassicRingTone() {
    ringOscillatorsRef.current.forEach(({ context, oscillators }) => {
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      void context.close();
    });
    ringOscillatorsRef.current = [];
  }

  async function startMediaCall(mode: CallMode, acceptedByPeer = false) {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setError("Tu navegador no soporta llamadas locales.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setActiveMode(mode);
      setMicEnabled(true);
      setCameraEnabled(mode === "video");
      setMonitorEnabled(false);
      setSeconds(0);
      setError(null);
      setPhase("active");
      setNotice(acceptedByPeer ? "Llamada conectada." : "Conectando llamada…");
      dispatchCallEvent(mode === "video" ? "started-video" : "started-audio", mode === "video" ? "Videollamada iniciada" : "Llamada de voz iniciada");
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = stream;
      }
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.muted = true;
      }
      setIsLauncherOpen(false);
    } catch {
      setError("No pudimos acceder al micrófono o la cámara.");
    }
  }

  function beginOutgoingCall(mode: CallMode) {
    setIncomingMode(null);
    setActiveMode(mode);
    setPhase("outgoing");
    setNotice("Llamando… esperando que el otro usuario conteste (15s)");
    setError(null);
    startClassicRingTone();
    emitSignal({ type: "invite", key: chatLogKey, mode });
    clearRingingTimeout();
    ringingTimeoutRef.current = window.setTimeout(() => {
      stopClassicRingTone();
      setPhase("idle");
      setNotice("Nadie respondió la llamada.");
      emitSignal({ type: "timeout", key: chatLogKey, mode });
    }, RING_TIMEOUT_MS);
  }

  async function acceptIncomingCall() {
    if (!incomingMode) return;
    stopClassicRingTone();
    clearRingingTimeout();
    emitSignal({ type: "accepted", key: chatLogKey, mode: incomingMode });
    await startMediaCall(incomingMode, true);
    setIncomingMode(null);
  }

  function rejectIncomingCall() {
    stopClassicRingTone();
    clearRingingTimeout();
    setIncomingMode(null);
    setPhase("idle");
    setNotice("Llamada rechazada.");
    emitSignal({ type: "rejected", key: chatLogKey, mode: activeMode ?? undefined });
  }

  function internalEndCall(notifyPeer: boolean) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.muted = true;
    }
    setActiveMode(null);
    setIncomingMode(null);
    setPhase("idle");
    setMicEnabled(true);
    setCameraEnabled(true);
    setMonitorEnabled(false);
    setSeconds(0);
    setNotice("Llamada finalizada");
    if (notifyPeer) emitSignal({ type: "ended", key: chatLogKey });
    dispatchCallEvent("ended", "Llamada finalizada");
  }

  function endCall() {
    stopClassicRingTone();
    clearRingingTimeout();
    internalEndCall(true);
  }

  function cancelOutgoingCall() {
    stopClassicRingTone();
    clearRingingTimeout();
    setPhase("idle");
    setNotice("Llamada cancelada.");
    emitSignal({ type: "ended", key: chatLogKey, mode: activeMode ?? undefined });
  }

  function toggleMic() {
    const next = !micEnabled;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  }

  function toggleMonitor() {
    setMonitorEnabled((prev) => !prev);
  }

  return (
    <div ref={launcherRef} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsLauncherOpen((current) => !current)}
        aria-expanded={isLauncherOpen}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-input px-3 py-1 text-xs font-medium hover:bg-muted"
      >
        <IconPhone className="size-3.5" aria-hidden />
        Llamadas
      </button>
      {isLauncherOpen ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[112] w-[min(92vw,26rem)] rounded-3xl border border-violet-300/30 bg-[#111a34f2] p-4 shadow-2xl shadow-violet-950/40">
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-violet-200/80">Sección de llamadas</p>
                <p className="text-base font-semibold text-white">{contactName}</p>
                <p className="text-xs text-slate-300">{contextLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLauncherOpen(false)}
                className="rounded-full border border-violet-200/30 px-3 py-1 text-xs text-slate-100"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => beginOutgoingCall("audio")}
                disabled={phase !== "idle"}
                className="rounded-2xl border border-violet-200/30 bg-violet-500/15 p-3 text-left text-slate-50 transition hover:bg-violet-400/20 disabled:opacity-60"
              >
                <IconPhone className="mb-2 size-5" aria-hidden />
                <p className="text-sm font-semibold">Llamada de audio</p>
              </button>
              <button
                type="button"
                onClick={() => beginOutgoingCall("video")}
                disabled={phase !== "idle"}
                className="rounded-2xl border border-violet-200/30 bg-sky-500/10 p-3 text-left text-slate-50 transition hover:bg-sky-400/20 disabled:opacity-60"
              >
                <IconVideo className="mb-2 size-5" aria-hidden />
                <p className="text-sm font-semibold">Videollamada</p>
              </button>
            </div>
            {phase === "outgoing" ? (
              <button onClick={cancelOutgoingCall} className="mt-3 rounded-full border border-rose-300/60 px-3 py-1 text-xs text-rose-200">Cancelar llamada</button>
            ) : null}
            {notice ? <p className="mt-3 rounded-xl border border-violet-200/20 bg-black/15 px-3 py-2 text-xs text-violet-100">{notice}</p> : null}
          </div>
        </div>
      ) : null}

      {phase === "incoming" && incomingMode ? (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-violet-300/40 bg-[#0f172de6] p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-violet-200/80">Llamada entrante</p>
            <p className="mt-2 text-lg font-semibold text-white">{contactName}</p>
            <p className="mt-1 text-xs text-slate-300">{incomingMode === "video" ? "Videollamada" : "Llamada de audio"}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={rejectIncomingCall} className="rounded-full border border-rose-300/60 px-4 py-1.5 text-xs text-rose-200">Rechazar</button>
              <button onClick={() => void acceptIncomingCall()} className="rounded-full border border-emerald-300/60 px-4 py-1.5 text-xs text-emerald-200">Contestar</button>
            </div>
          </div>
        </div>
      ) : null}

      {active ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-violet-300/30 bg-[#0f172de6] p-5 shadow-2xl shadow-violet-950/40">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">Llamada con {contactName}</p>
                <p className="text-xs text-slate-300">Duración {elapsedText} · {activeMode === "video" ? "Video" : "Audio"}</p>
              </div>
            </div>
            {activeMode === "video" ? (
              <video ref={videoRef} autoPlay muted playsInline className="mt-4 aspect-video w-full rounded-2xl border border-violet-200/20 bg-black/70 object-cover" />
            ) : (
              <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-2xl border border-violet-200/20 bg-[#0a1025] text-sm text-slate-300">
                <div className="mb-3 flex size-16 items-center justify-center rounded-full border border-violet-200/30 bg-violet-500/15 text-white">
                  <IconPhone className="size-7" aria-hidden />
                </div>
                <p className="text-base font-semibold text-white">{contactName}</p>
              </div>
            )}
            <audio ref={audioRef} autoPlay playsInline className="hidden" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleMic} className="inline-flex items-center gap-1 rounded-full border border-violet-200/25 px-3 py-1 text-xs text-slate-100">
                <IconMic className="size-3.5" aria-hidden />
                {micEnabled ? "Silenciar" : "Activar mic"}
              </button>
              {activeMode === "video" ? (
                <button type="button" onClick={toggleCamera} className="inline-flex items-center gap-1 rounded-full border border-violet-200/25 px-3 py-1 text-xs text-slate-100">
                  <IconVideo className="size-3.5" aria-hidden />
                  {cameraEnabled ? "Apagar cámara" : "Encender cámara"}
                </button>
              ) : null}
              <button type="button" onClick={toggleMonitor} className="inline-flex items-center gap-1 rounded-full border border-violet-200/25 px-3 py-1 text-xs text-slate-100">
                {monitorEnabled ? "Desactivar retorno de audio" : "Escuchar mi audio"}
              </button>
              <button type="button" onClick={endCall} className="inline-flex items-center gap-1 rounded-full border border-rose-300/60 px-3 py-1 text-xs text-rose-200">
                Colgar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {error ? <p className="hidden text-xs text-rose-300 md:block">{error}</p> : null}
    </div>
  );
}
