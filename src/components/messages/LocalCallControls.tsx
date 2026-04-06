"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconMic, IconPhone, IconVideo } from "@/components/icons";

type CallMode = "audio" | "video";

export default function LocalCallControls({
  contactName = "Contacto",
  contextLabel = "Mensajes",
}: {
  contactName?: string;
  contextLabel?: string;
}) {
  const [activeMode, setActiveMode] = useState<CallMode | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);

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
      setIsLauncherOpen(false);
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
                onClick={() => startLocalCall("audio")}
                className="rounded-2xl border border-violet-200/30 bg-violet-500/15 p-3 text-left text-slate-50 transition hover:bg-violet-400/20"
              >
                <IconPhone className="mb-2 size-5" aria-hidden />
                <p className="text-sm font-semibold">Llamada de audio</p>
                <p className="text-[11px] text-slate-300">Como Instagram: pantalla dedicada y controles rápidos.</p>
              </button>
              <button
                type="button"
                onClick={() => startLocalCall("video")}
                className="rounded-2xl border border-violet-200/30 bg-sky-500/10 p-3 text-left text-slate-50 transition hover:bg-sky-400/20"
              >
                <IconVideo className="mb-2 size-5" aria-hidden />
                <p className="text-sm font-semibold">Videollamada</p>
                <p className="text-[11px] text-slate-300">Vista inmersiva con temporizador y atajos.</p>
              </button>
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
              <span className="rounded-full border border-violet-300/50 bg-violet-500/20 px-3 py-1 text-[11px] font-medium text-violet-100">
                Interfaz tipo Instagram
              </span>
            </div>
            {activeMode === "video" ? (
              <video ref={videoRef} autoPlay muted playsInline className="mt-4 aspect-video w-full rounded-2xl border border-violet-200/20 bg-black/70 object-cover" />
            ) : (
              <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-2xl border border-violet-200/20 bg-[#0a1025] text-sm text-slate-300">
                <div className="mb-3 flex size-16 items-center justify-center rounded-full border border-violet-200/30 bg-violet-500/15 text-white">
                  <IconPhone className="size-7" aria-hidden />
                </div>
                <p className="text-base font-semibold text-white">{contactName}</p>
                <p className="text-xs text-slate-300">Llamada de audio en curso</p>
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
