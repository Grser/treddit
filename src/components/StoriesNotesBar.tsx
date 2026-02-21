"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  viewed_by_me?: boolean;
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
  const [storyMediaUrls, setStoryMediaUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerProgress, setViewerProgress] = useState(0);
  const [isStoryMenuOpen, setIsStoryMenuOpen] = useState(false);

  const sortedStories = useMemo(
    () => [...users].sort((a, b) => {
      const dateDiff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (dateDiff !== 0) return dateDiff;
      return Number(a.story_id || 0) - Number(b.story_id || 0);
    }),
    [users],
  );
  const myStories = useMemo(() => (me ? sortedStories.filter((story) => story.id === me.id) : []), [me, sortedStories]);
  const myStoriesCount = myStories.length;
  const firstStoryMediaUrl = storyMediaUrls[0] || "";
  const storyPreviewIsVideo = isVideoUrl(firstStoryMediaUrl);
  const activeUserStories = useMemo(() => {
    if (activeUserId === null) return [] as StoryItem[];
    return sortedStories.filter((story) => story.id === activeUserId);
  }, [activeUserId, sortedStories]);
  const activeStory = activeUserStories[viewerIndex] || null;
  const activeStoryViewers = activeStory?.viewers || [];

  const otherUsers = useMemo(() => {
    const grouped = new Map<number, StoryItem & { storyCount: number; seenCount: number }>();
    for (const story of sortedStories) {
      if (me?.id === story.id) continue;
      const existing = grouped.get(story.id);
      if (existing) {
        existing.storyCount += 1;
        if (story.viewed_by_me) existing.seenCount += 1;
        continue;
      }
      grouped.set(story.id, { ...story, storyCount: 1, seenCount: story.viewed_by_me ? 1 : 0 });
    }
    return Array.from(grouped.values())
      .sort((a, b) => {
        const aSeen = a.seenCount >= a.storyCount;
        const bSeen = b.seenCount >= b.storyCount;
        if (aSeen !== bSeen) return aSeen ? 1 : -1;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      })
      .slice(0, 12);
  }, [me?.id, sortedStories]);

  const orderedOtherUserIds = useMemo(() => otherUsers.map((user) => user.id), [otherUsers]);

  const moveToNextStoryOrUser = useCallback((currentIndex: number) => {
    if (currentIndex < activeUserStories.length - 1) {
      setViewerIndex(currentIndex + 1);
      return;
    }

    const unseenUserId = otherUsers.find((user) => user.id !== activeUserId && user.seenCount < user.storyCount)?.id;
    if (unseenUserId) {
      setActiveUserId(unseenUserId);
      setViewerIndex(0);
      return;
    }

    const currentOrderIndex = orderedOtherUserIds.findIndex((id) => id === activeUserId);
    const fallbackUserId = currentOrderIndex >= 0 ? orderedOtherUserIds[currentOrderIndex + 1] : null;
    if (fallbackUserId) {
      setActiveUserId(fallbackUserId);
      setViewerIndex(0);
      return;
    }

    setActiveUserId(null);
    setViewerIndex(0);
  }, [activeUserId, activeUserStories.length, orderedOtherUserIds, otherUsers]);

  function openPublishModal() {
    setIsPublishing(true);
    setStoryMediaUrls([]);
    setStoryText("");
    setPublishError(null);
    setIsStoryMenuOpen(false);
  }

  function openStoryViewerForUser(userId: number) {
    setActiveUserId(userId);
    setViewerIndex(0);
    setViewerProgress(0);
    setIsStoryMenuOpen(false);
  }

  function buildStoryRing(storyCount: number, seenCount = 0) {
    const safeTotal = Math.max(1, storyCount);
    const safeSeen = Math.min(safeTotal, Math.max(0, seenCount));
    const viewedColor = "rgba(148, 163, 184, 0.95)";
    const freshColor = "rgba(236, 72, 153, 0.98)";
    const separatorColor = "rgba(5, 13, 24, 1)";
    const segment = 360 / safeTotal;
    const paint = segment * 0.84;
    const stops: string[] = [];
    for (let i = 0; i < safeTotal; i += 1) {
      const start = i * segment;
      const end = start + paint;
      const color = i < safeSeen ? viewedColor : freshColor;
      stops.push(`${color} ${start}deg ${end}deg`);
      stops.push(`${separatorColor} ${end}deg ${(i + 1) * segment}deg`);
    }
    return { background: `conic-gradient(${stops.join(", ")})` };
  }

  useEffect(() => {
    if (!activeStory) {
      setViewerProgress(0);
      return;
    }

    setViewerProgress(0);
    const increment = 100 / (STORY_DURATION_MS / STORY_TICK_MS);
    const interval = window.setInterval(() => {
      setViewerProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          moveToNextStoryOrUser(viewerIndex);
          return 100;
        }
        return next;
      });
    }, STORY_TICK_MS);

    return () => window.clearInterval(interval);
  }, [activeStory, moveToNextStoryOrUser, viewerIndex]);

  useEffect(() => {
    if (!activeStory || !me || activeStory.id === me.id || !activeStory.story_id) return;
    void fetch("/api/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: activeStory.story_id }),
    }).catch(() => undefined);
  }, [activeStory, me]);

  async function handleUpload(files: File[]) {
    if (files.length === 0) return;

    setIsUploading(true);
    setPublishError(null);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
        if (!res.ok || !data.url) {
          setPublishError(data.error || "No se pudo subir uno de los archivos.");
          continue;
        }
        uploadedUrls.push(data.url);
      }

      if (uploadedUrls.length > 0) {
        setStoryMediaUrls((prev) => [...new Set([...prev, ...uploadedUrls])].slice(0, 10));
      }
    } catch {
      setPublishError("No se pudieron subir los archivos.");
    } finally {
      setIsUploading(false);
    }
  }

  async function publishStory() {
    const normalizedText = storyText.trim();
    const normalizedMediaUrls = storyMediaUrls.map((url) => url.trim()).filter(Boolean);
    if (normalizedMediaUrls.length === 0) {
      setPublishError("Sube una foto o video para publicar tu historia.");
      return;
    }

    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: normalizedText, media_urls: normalizedMediaUrls }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo publicar tu historia.");
        return;
      }

      setStoryText("");
      setStoryMediaUrls([]);
      setIsPublishing(false);
      setIsStoryMenuOpen(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo publicar tu historia.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMyStory(storyId?: number) {
    if (!me) return;
    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/stories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: storyId ? JSON.stringify({ storyId }) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo borrar tu historia.");
        return;
      }
      setIsPublishing(false);
      setActiveUserId(null);
      setViewerIndex(0);
      setIsStoryMenuOpen(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo borrar tu historia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {canInteract && myStoriesCount > 0 && (
          <button
            type="button"
            onClick={openPublishModal}
            className="group min-w-16 max-w-16 shrink-0 text-center"
            title="Subir más historias"
          >
            <div className="mx-auto mb-1.5 grid size-[64px] place-items-center rounded-full border border-dashed border-border bg-input text-2xl text-foreground transition group-hover:scale-[1.03]">
              +
            </div>
            <p className="truncate text-[11px] text-foreground/90">Agregar</p>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (!canInteract) {
              router.push("/auth/login");
              return;
            }
            if (myStoriesCount > 0) {
              if (me?.id) {
                openStoryViewerForUser(me.id);
              }
              return;
            }
            openPublishModal();
          }}
          className="group min-w-18 max-w-20 shrink-0 text-center"
          title={canInteract ? (myStoriesCount > 0 ? "Ver tu historia" : "Publicar historia") : "Inicia sesión para publicar historias"}
        >
          <div
            className="relative mx-auto mb-1.5 grid size-[64px] place-items-center rounded-full p-[2px] transition group-hover:scale-[1.03]"
            style={myStoriesCount > 0 ? buildStoryRing(myStoriesCount, myStoriesCount) : undefined}
          >
            <div className="relative grid size-full place-items-center overflow-hidden rounded-full bg-surface ring-[3px] ring-border">
              <Image
                src={me?.avatar_url || "/demo-reddit.png"}
                alt={me?.username || "Tu historia"}
                fill
                sizes="64px"
                className="rounded-full object-cover"
              />
            </div>
          </div>
          <p className="truncate text-[12px] font-medium text-foreground">Tu historia</p>
        </button>

        {otherUsers.map((user) => {
          const hasStory = Boolean(user.media_url);
          const seenAll = user.seenCount >= user.storyCount;
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => openStoryViewerForUser(user.id)}
              className="group min-w-18 max-w-20 shrink-0 text-center"
              title={`Ver historia de ${user.username}`}
            >
              <div
                className="relative mx-auto mb-1.5 size-[64px] rounded-full p-[2px] transition group-hover:scale-[1.03]"
                style={hasStory ? buildStoryRing(user.storyCount, user.seenCount) : undefined}
              >
                <div className="relative size-full overflow-hidden rounded-full bg-surface ring-[3px] ring-border">
                  <Image
                    src={user.avatar_url || "/demo-reddit.png"}
                    alt={user.nickname || user.username}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              </div>
              <p className={`truncate text-[12px] font-medium ${seenAll ? "text-foreground/65" : "text-foreground"}`}>{user.username}</p>
            </button>
          );
        })}

        {sortedStories.length === 0 && (
          <p className="px-2 py-6 text-sm text-foreground/70">Aún no hay historias disponibles.</p>
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
              multiple
              onChange={(event) => {
                const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
                void handleUpload(selectedFiles);
                event.currentTarget.value = "";
              }}
              className="mt-1 block w-full text-sm text-foreground/80 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
              disabled={isUploading || isSaving}
            />
            <p className="mt-1 text-[11px] opacity-70">Puedes seleccionar varias fotos o videos a la vez (máximo 10).</p>

            {firstStoryMediaUrl && (
              <div className="relative mt-3 h-52 w-full overflow-hidden rounded-xl border border-border">
                {storyPreviewIsVideo ? (
                  <video src={firstStoryMediaUrl} controls className="h-full w-full object-cover" />
                ) : (
                  <Image src={firstStoryMediaUrl} alt="Preview de historia" fill sizes="100vw" className="object-cover" unoptimized />
                )}
              </div>
            )}
            {storyMediaUrls.length > 1 && <p className="mt-2 text-xs opacity-80">{storyMediaUrls.length} historias listas para publicar.</p>}

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
                onClick={() => deleteMyStory(myStories[0]?.story_id)}
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
                setViewerIndex((prev) => Math.max(0, prev - 1));
              }}
              className="hidden size-10 place-items-center rounded-full border border-white/25 bg-black/40 text-xl text-white disabled:opacity-30 sm:grid"
              disabled={viewerIndex === 0}
            >
              ‹
            </button>

            <article className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-zinc-900">
              <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-2">
                {activeUserStories.map((story, index) => {
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
                          onClick={openPublishModal}
                          disabled={isSaving}
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Agregar historias
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMyStory(activeStory.story_id)}
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
                    setActiveUserId(null);
                    setViewerIndex(0);
                  }}
                  className="text-lg leading-none text-white/90"
                  aria-label="Cerrar visor"
                >
                  ×
                </button>
              </div>

              <div className="relative h-[70vh] min-h-[360px] w-full bg-black sm:min-h-[420px]">
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
                moveToNextStoryOrUser(viewerIndex);
              }}
              className="hidden size-10 place-items-center rounded-full border border-white/25 bg-black/40 text-xl text-white disabled:opacity-30 sm:grid"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
