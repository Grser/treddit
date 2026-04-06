"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconMic, IconPhone, IconVideo } from "@/components/icons";

type CallMode = "audio" | "video";

export default function LocalCallControls() {
  const [activeMode, setActiveMode] = useState<CallMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      setSeconds(0);
      setError(null);
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("No pudimos acceder al micrófono o la cámara.");
    }
  }

  function endCall() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActiveMode(null);
    setMicEnabled(true);
    setCameraEnabled(true);
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
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">Llamada local activa</p>
            <p className="text-xs opacity-75">Duración {elapsedText}</p>
            {activeMode === "video" ? (
              <video ref={videoRef} autoPlay muted playsInline className="mt-3 aspect-video w-full rounded-xl bg-black/70 object-cover" />
            ) : (
              <div className="mt-3 flex h-36 items-center justify-center rounded-xl border border-border bg-input/60 text-sm opacity-80">
                Llamada de audio local
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleMic} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                <IconMic className="size-3.5" aria-hidden />
                {micEnabled ? "Silenciar" : "Activar mic"}
              </button>
              {activeMode === "video" ? (
                <button type="button" onClick={toggleCamera} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                  <IconVideo className="size-3.5" aria-hidden />
                  {cameraEnabled ? "Apagar cámara" : "Encender cámara"}
                </button>
              ) : null}
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
