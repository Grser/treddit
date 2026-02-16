"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StoryUser = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url?: string | null;
};

type Props = {
  canInteract: boolean;
  users: StoryUser[];
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
  const [isSaving, setIsSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const withMe = me
    ? [{ id: me.id, username: me.username, nickname: "Tu historia", avatar_url: me.avatar_url ?? null }, ...users]
    : users;

  const uniqueUsers = withMe.filter((user, index, arr) => arr.findIndex((item) => item.id === user.id) === index).slice(0, 12);

  async function publishStory() {
    const normalizedText = storyText.trim();
    if (!normalizedText) {
      setPublishError("Escribe algo para publicar tu historia.");
      return;
    }

    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `📸 Historia: ${normalizedText}` }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo publicar tu historia.");
        return;
      }

      setStoryText("");
      setIsPublishing(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo publicar tu historia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Historias</h2>
          <p className="text-xs opacity-70">Publicaciones rápidas de la comunidad</p>
        </div>
        {!canInteract && <span className="text-xs text-brand">Inicia sesión para publicar</span>}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            if (!canInteract) {
              router.push("/auth/login");
              return;
            }
            setIsPublishing(true);
          }}
          className="group min-w-20 max-w-24 shrink-0 text-center"
          title={canInteract ? "Publicar historia" : "Inicia sesión para publicar historias"}
        >
          <div className="relative mx-auto mb-1 grid size-16 place-items-center rounded-full bg-gradient-to-br from-brand via-fuchsia-500 to-amber-300 p-[2px] transition group-hover:scale-[1.03]">
            <div className="grid size-full place-items-center rounded-full bg-surface ring-2 ring-surface text-2xl font-bold">
              +
            </div>
          </div>
          <p className="truncate text-xs font-medium">Nueva story</p>
        </button>

        {uniqueUsers.map((user) => {
          const isMe = me?.id === user.id;
          return (
            <a
              key={user.id}
              href={isMe ? "/perfil" : `/u/${user.username}`}
              className="group min-w-20 max-w-24 shrink-0 text-center"
              title={isMe ? "Tu historia" : `Ver historia de ${user.username}`}
            >
              <div className="relative mx-auto mb-1 size-16 rounded-full bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 p-[2px] transition group-hover:scale-[1.03]">
                <div className="relative size-full overflow-hidden rounded-full bg-surface ring-2 ring-surface">
                  <Image
                    src={user.avatar_url || "/demo-reddit.png"}
                    alt={user.nickname || user.username}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              </div>
              <p className="truncate text-xs font-medium">{isMe ? "Tu story" : user.username}</p>
            </a>
          );
        })}

        {uniqueUsers.length === 0 && (
          <p className="px-2 py-6 text-sm opacity-70">Aún no hay historias disponibles.</p>
        )}
      </div>

      {isPublishing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h3 className="text-base font-semibold">Publicar historia</h3>
            <p className="mt-1 text-xs opacity-70">Se publicará como un post rápido en tu feed.</p>
            <textarea
              value={storyText}
              onChange={(event) => setStoryText(event.target.value)}
              maxLength={220}
              rows={4}
              className="mt-3 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
              placeholder="¿Qué quieres compartir en tu historia?"
            />
            <div className="mt-1 text-right text-[11px] opacity-70">{storyText.length}/220</div>
            {publishError && <p className="mt-2 text-xs text-red-400">{publishError}</p>}
            <div className="mt-4 flex justify-end gap-2">
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
                disabled={isSaving}
                className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
