"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STORY_DURATION_MS = 5000;
const STORY_TICK_MS = 100;

function isVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(parsedUrl.pathname);
  } catch {
    return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
  }
}

function storyAgeLabel(createdAt?: string) {
  if (!createdAt) return "ahora";
  const value = new Date(createdAt).getTime();
  if (!Number.isFinite(value)) return "ahora";
  const diffHours = Math.max(1, Math.round((Date.now() - value) / (1000 * 60 * 60)));
  return `${diffHours} h`;
}

type StoryItem = {
  id: number;
  story_id?: number;
  username: string;
  nickname: string | null;
  avatar_url?: string | null;
  content?: string | null;
  media_url?: string | null;
  created_at?: string;
  viewers?: {
    id: number;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
    viewed_at: string;
  }[];
};

type Props = {
  canInteract: boolean;
  users: StoryItem[];
  me?: {
    id: number;
    username: string;
    avatar_url?: string | null;
  } | null;
};

export default function StoriesNotesBar({ canInteract, users, me }: Props) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyMediaUrl, setStoryMediaUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerProgress, setViewerProgress] = useState(0);
  const [isStoryMenuOpen, setIsStoryMenuOpen] = useState(false);

  const sortedStories = useMemo(
    () => [...users].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [users],
  );
  const myStories = useMemo(() => (me ? sortedStories.filter((story) => story.id === me.id) : []), [me, sortedStories]);
  const myStoriesCount = myStories.length;
  const storyPreviewIsVideo = isVideoUrl(storyMediaUrl);
  const activeStory = viewerIndex !== null ? sortedStories[viewerIndex] : null;
  const activeStoryViewers = activeStory?.viewers || [];

  const otherUsers = useMemo(() => {
    const grouped = new Map<number, StoryItem & { storyCount: number }>();
    for (const story of sortedStories) {
      if (me?.id === story.id) continue;
      const existing = grouped.get(story.id);
      if (existing) {
        existing.storyCount += 1;
        continue;
      }
      grouped.set(story.id, { ...story, storyCount: 1 });
    }
    return Array.from(grouped.values()).slice(0, 12);
  }, [me?.id, sortedStories]);

  useEffect(() => {
    if (viewerIndex === null || !sortedStories[viewerIndex]) {
      setViewerProgress(0);
      return;
    }

    setViewerProgress(0);
    const increment = 100 / (STORY_DURATION_MS / STORY_TICK_MS);
    const interval = window.setInterval(() => {
      setViewerProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          setViewerIndex((current) => {
            if (current === null) return null;
            return current < sortedStories.length - 1 ? current + 1 : null;
          });
          return 100;
        }
        return next;
      });
    }, STORY_TICK_MS);

    return () => window.clearInterval(interval);
  }, [viewerIndex, sortedStories]);

  useEffect(() => {
    if (!activeStory || !me || activeStory.id === me.id || !activeStory.story_id) return;
    void fetch("/api/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: activeStory.story_id }),
    }).catch(() => undefined);
  }, [activeStory, me]);

  async function handleUpload(file?: File | null) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    setIsUploading(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok || !data.url) {
        setPublishError(data.error || "No se pudo subir el archivo.");
        return;
      }
      setStoryMediaUrl(data.url);
    } catch {
      setPublishError("No se pudo subir el archivo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function publishStory() {
    const normalizedText = storyText.trim();
    const normalizedMedia = storyMediaUrl.trim();
    if (!normalizedMedia) {
      setPublishError("Sube una foto o video para publicar tu historia.");
      return;
    }

    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: normalizedText, media_url: normalizedMedia }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo publicar tu historia.");
        return;
      }

      setStoryText("");
      setStoryMediaUrl("");
      setIsPublishing(false);
      setIsStoryMenuOpen(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo publicar tu historia.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMyStory() {
    if (!me) return;
    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/stories", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo borrar tu historia.");
        return;
      }
      setIsPublishing(false);
      setViewerIndex(null);
      setIsStoryMenuOpen(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo borrar tu historia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-[#050d18] p-3 sm:p-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            if (!canInteract) {
              router.push("/auth/login");
              return;
            }
            if (myStoriesCount > 0) {
              const firstMyStoryIndex = sortedStories.findIndex((story) => story.id === me?.id);
              setViewerIndex(firstMyStoryIndex >= 0 ? firstMyStoryIndex : null);
              setIsStoryMenuOpen(false);
              return;
            }
            setIsPublishing(true);
            setStoryMediaUrl("");
            setStoryText("");
            setPublishError(null);
            setIsStoryMenuOpen(false);
          }}
          className="group min-w-18 max-w-20 shrink-0 text-center"
          title={canInteract ? (myStoriesCount > 0 ? "Ver tu historia" : "Publicar historia") : "Inicia sesión para publicar historias"}
        >
          <div
            className={`relative mx-auto mb-1.5 grid size-[64px] place-items-center rounded-full p-[2px] transition group-hover:scale-[1.03] ${
              myStoriesCount > 0
                ? "bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-500"
                : "bg-white/20"
            }`}
          >
            <div className="relative grid size-full place-items-center overflow-hidden rounded-full bg-surface ring-[3px] ring-[#050d18]">
              <Image
                src={me?.avatar_url || "/demo-reddit.png"}
                alt={me?.username || "Tu historia"}
                fill
                sizes="64px"
                className="rounded-full object-cover"
              />
              {myStoriesCount > 1 && (
                <span className="absolute -top-1 -left-1 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                  {myStoriesCount}
                </span>
              )}
            </div>
          </div>
          <p className="truncate text-[12px] font-medium text-white">Tu historia</p>
        </button>

        {otherUsers.map((user) => {
          const hasStory = Boolean(user.media_url);
          const firstStoryIndex = sortedStories.findIndex((story) => story.id === user.id);
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => setViewerIndex(firstStoryIndex >= 0 ? firstStoryIndex : null)}
              className="group min-w-18 max-w-20 shrink-0 text-center"
              title={`Ver historia de ${user.username}`}
            >
              <div
                className={`relative mx-auto mb-1.5 size-[64px] rounded-full p-[2px] transition group-hover:scale-[1.03] ${
                  hasStory ? "bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-500" : "bg-white/20"
                }`}
              >
                <div className="relative size-full overflow-hidden rounded-full bg-surface ring-[3px] ring-[#050d18]">
                  <Image
                    src={user.avatar_url || "/demo-reddit.png"}
                    alt={user.nickname || user.username}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                  {user.storyCount > 1 && (
                    <span className="absolute -top-1 -left-1 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                      {user.storyCount}
                    </span>
                  )}
                </div>
              </div>
              <p className="truncate text-[12px] font-medium text-white">{user.username}</p>
            </button>
          );
        })}

        {sortedStories.length === 0 && (
          <p className="px-2 py-6 text-sm text-white/70">Aún no hay historias disponibles.</p>
        )}
      </div>

      {!canInteract && <p className="mt-2 text-xs text-brand">Inicia sesión para publicar historias.</p>}

      {isPublishing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h3 className="text-base font-semibold">Publicar historia</h3>
            <p className="mt-1 text-xs opacity-70">Tu historia estará visible por 24 horas.</p>

            <label className="mt-3 block text-xs font-medium opacity-90">Foto o video</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => handleUpload(event.target.files?.[0])}
              className="mt-1 block w-full text-sm text-foreground/80 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
              disabled={isUploading || isSaving}
            />

            {storyMediaUrl && (
              <div className="relative mt-3 h-52 w-full overflow-hidden rounded-xl border border-border">
                {storyPreviewIsVideo ? (
                  <video src={storyMediaUrl} controls className="h-full w-full object-cover" />
                ) : (
                  <Image src={storyMediaUrl} alt="Preview de historia" fill sizes="100vw" className="object-cover" unoptimized />
                )}
              </div>
            )}

            <textarea
              value={storyText}
              onChange={(event) => setStoryText(event.target.value)}
              maxLength={220}
              rows={3}
              className="mt-3 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
              placeholder="Texto opcional en la historia"
            />
            <div className="mt-1 text-right text-[11px] opacity-70">{storyText.length}/220</div>
            {publishError && <p className="mt-2 text-xs text-red-400">{publishError}</p>}
            <div className="mt-4 flex justify-between gap-2">
              <button
                type="button"
                onClick={deleteMyStory}
                disabled={isSaving || myStoriesCount === 0}
                className="inline-flex h-9 items-center justify-center rounded-full border border-red-400/70 px-4 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Borrar historia
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPublishing(false);
                    setPublishError(null);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={publishStory}
                  disabled={isSaving || isUploading}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Publicando..." : isUploading ? "Subiendo..." : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStory && (
        <div className="fixed inset-0 z-[80] bg-black/95 px-3 py-4 sm:p-6">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsStoryMenuOpen(false);
                setViewerIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
              }}
              className="grid size-10 place-items-center rounded-full border border-white/25 bg-black/40 text-xl text-white disabled:opacity-30"
              disabled={viewerIndex === 0}
            >
              ‹
            </button>

            <article className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-zinc-900">
              <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-2">
                {sortedStories.map((story, index) => {
                  const isPast = index < viewerIndex;
                  const isCurrent = index === viewerIndex;
                  return (
                    <div key={`${story.story_id || story.id}-${story.created_at}-${index}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-white transition-[width] duration-100"
                        style={{ width: `${isPast ? 100 : isCurrent ? viewerProgress : 0}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-x-0 top-0 z-30 mt-4 flex items-center gap-2 px-3 pt-3 text-white">
                <div className="relative size-8 overflow-hidden rounded-full ring-2 ring-black/20">
                  <Image
                    src={activeStory.avatar_url || "/demo-reddit.png"}
                    alt={activeStory.username}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
                <p className="text-sm font-medium">{activeStory.username}</p>
                <span className="text-xs text-white/70">{storyAgeLabel(activeStory.created_at)}</span>
                {me?.id === activeStory.id && (
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsStoryMenuOpen((prev) => !prev)}
                      className="grid size-8 place-items-center rounded-full bg-black/40 text-lg leading-none text-white"
                      aria-label="Opciones de historia"
                    >
                      ⋯
                    </button>

                    {isStoryMenuOpen && (
                      <div className="absolute right-0 top-10 min-w-36 rounded-xl border border-white/15 bg-zinc-950 p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={deleteMyStory}
                          disabled={isSaving}
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Borrando..." : "Borrar historia"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsStoryMenuOpen(false);
                    setViewerIndex(null);
                  }}
                  className="text-lg leading-none text-white/90"
                  aria-label="Cerrar visor"
                >
                  ×
                </button>
              </div>

              <div className="relative h-[72vh] min-h-[420px] w-full bg-black">
                {isVideoUrl(activeStory.media_url) ? (
                  <video
                    src={activeStory.media_url || ""}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image
                    src={activeStory.media_url || "/demo-reddit.png"}
                    alt={`Historia de ${activeStory.username}`}
                    fill
                    sizes="(max-width: 768px) 90vw, 420px"
                    className="object-contain"
                    unoptimized
                  />
                )}
              </div>

              <div className="border-t border-white/15 p-3 text-sm text-white/90">
                {activeStory.content && <p>{activeStory.content}</p>}
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <span>👁️</span>
                    <span>{me?.id === activeStory.id ? `Visto por ${activeStoryViewers.length} personas` : "Historia privada"}</span>
                  </div>
                  {me?.id === activeStory.id && activeStoryViewers.length > 0 && (
                    <div className="flex -space-x-2">
                      {activeStoryViewers.slice(0, 3).map((viewer) => (
                        <div key={`viewer-${activeStory.story_id || activeStory.id}-${viewer.id}`} className="relative size-6 overflow-hidden rounded-full border border-black/70">
                          <Image
                            src={viewer.avatar_url || "/demo-reddit.png"}
                            alt={viewer.username}
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <button
              type="button"
              onClick={() => {
                setIsStoryMenuOpen(false);
                setViewerIndex((prev) => (prev !== null && prev < sortedStories.length - 1 ? prev + 1 : prev));
              }}
              className="grid size-10 place-items-center rounded-full border border-white/25 bg-black/40 text-xl text-white disabled:opacity-30"
              disabled={viewerIndex === sortedStories.length - 1}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
