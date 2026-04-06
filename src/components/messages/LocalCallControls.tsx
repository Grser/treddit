"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconMic, IconPhone, IconVideo } from "@/components/icons";

type CallMode = "audio" | "video";

export default function LocalCallControls() {
  const [activeMode, setActiveMode] = useState<CallMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const active = activeMode !== null;

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

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

  async function startLocalCall(mode: CallMode) {
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
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = stream;
      }
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.muted = true;
      }
    } catch {
      setError("No pudimos acceder al micrófono o la cámara.");
    }
  }

  function endCall() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.muted = true;
    }
    setActiveMode(null);
    setMicEnabled(true);
    setCameraEnabled(true);
    setMonitorEnabled(false);
    setSeconds(0);
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => startLocalCall("audio")}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-input px-3 py-1 text-xs hover:bg-muted"
      >
        <IconPhone className="size-3.5" aria-hidden />
        Llamar
      </button>
      <button
        type="button"
        onClick={() => startLocalCall("video")}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-input px-3 py-1 text-xs hover:bg-muted"
      >
        <IconVideo className="size-3.5" aria-hidden />
        Video
      </button>
      {active ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-violet-300/30 bg-[#0f172de6] p-5 shadow-2xl shadow-violet-950/40">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">Llamada local activa</p>
                <p className="text-xs text-slate-300">Duración {elapsedText}</p>
              </div>
              <span className="rounded-full border border-violet-300/50 bg-violet-500/20 px-3 py-1 text-[11px] font-medium text-violet-100">
                Estilo Treddit
              </span>
            </div>
            {activeMode === "video" ? (
              <video ref={videoRef} autoPlay muted playsInline className="mt-4 aspect-video w-full rounded-2xl border border-violet-200/20 bg-black/70 object-cover" />
            ) : (
              <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-violet-200/20 bg-[#0a1025] text-sm text-slate-300">
                Llamada de audio local (sin UI de terceros)
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
            <p className="mt-2 text-[11px] text-slate-400">
              Consejo: activa “Escuchar mi audio” solo para pruebas rápidas; puede generar eco.
            </p>
          </div>
        </div>
      ) : null}
      {error ? <p className="hidden text-xs text-rose-300 md:block">{error}</p> : null}
    </div>
  );
}
