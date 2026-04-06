"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AudioBubblePlayerProps = {
  src: string;
  className?: string;
  compact?: boolean;
};

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AudioBubblePlayer({ src, className = "", compact = false }: AudioBubblePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setReady(true);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
      return;
    }
    audio.pause();
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) return;
    const next = (value / 100) * duration;
    audio.currentTime = next;
    setCurrentTime(next);
  }

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  return (
    <div className={`w-full rounded-2xl border border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-500/20 via-violet-500/15 to-background/70 p-2.5 shadow-inner shadow-fuchsia-900/20 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlayback}
          className="grid size-9 shrink-0 place-content-center rounded-full border border-fuchsia-300/40 bg-fuchsia-500/25 text-sm text-white transition hover:scale-105 hover:bg-fuchsia-500/35"
          aria-label={playing ? "Pausar audio" : "Reproducir audio"}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <div className="flex items-end gap-1">
              {Array.from({ length: compact ? 10 : 16 }).map((_, index) => {
                const activeThreshold = ((index + 1) / (compact ? 10 : 16)) * 100;
                const isActive = progress >= activeThreshold;
                return (
                  <span
                    key={index}
                    className={`w-1 rounded-full transition-all ${compact ? "h-3" : index % 2 === 0 ? "h-4" : "h-6"} ${playing && isActive ? "animate-pulse bg-fuchsia-300" : isActive ? "bg-fuchsia-300/80" : "bg-fuchsia-200/20"}`}
                  />
                );
              })}
            </div>
            <span className="text-[10px] font-medium tabular-nums text-white/85">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={progress}
            disabled={!ready || duration <= 0}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Progreso del audio"
          />
        </div>
      </div>
    </div>
  );
}
