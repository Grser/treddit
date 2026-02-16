"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type NoteItem = {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  song_title?: string | null;
  song_artist?: string | null;
  song_url?: string | null;
};

type Props = {
  notes: NoteItem[];
  canInteract?: boolean;
  className?: string;
  me?: {
    id: number;
    username: string;
  } | null;
};

export default function NotesBar({ notes, canInteract = true, className, me = null }: Props) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const uniqueEntries = useMemo(
    () => notes.filter((entry, index, arr) => arr.findIndex((item) => item.userId === entry.userId) === index).slice(0, 12),
    [notes],
  );

  const myNote = me ? uniqueEntries.find((entry) => entry.userId === me.id) : null;

  async function publishNote() {
    const normalizedText = noteText.trim();
    if (!normalizedText) {
      setPublishError("Escribe algo para publicar tu nota.");
      return;
    }

    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: normalizedText,
          song_title: songTitle.trim(),
          song_artist: songArtist.trim(),
          song_url: songUrl.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo publicar tu nota.");
        return;
      }

      setNoteText("");
      setSongTitle("");
      setSongArtist("");
      setSongUrl("");
      setIsPublishing(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo publicar tu nota.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteNote() {
    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/notes", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo borrar tu nota.");
        return;
      }
      setIsPublishing(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo borrar tu nota.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={`rounded-2xl border border-border bg-[#050d18] p-3 sm:p-4 ${className ?? ""}`.trim()}>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            if (!canInteract) {
              router.push("/auth/login");
              return;
            }
            setNoteText(myNote?.content || "");
            setSongTitle(myNote?.song_title || "");
            setSongArtist(myNote?.song_artist || "");
            setSongUrl(myNote?.song_url || "");
            setIsPublishing(true);
          }}
          className="group min-w-20 max-w-24 shrink-0 text-center"
          title={canInteract ? "Publicar nota" : "Inicia sesión para publicar notas"}
        >
          <p className="mx-auto mb-1.5 line-clamp-2 min-h-9 rounded-2xl bg-white/14 px-2 py-1 text-[10px] leading-tight text-white/90">
            Publica una nota rápida
          </p>
          <div className="relative mx-auto mb-1 size-[58px] rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-500 p-[2px] transition group-hover:scale-[1.03]">
            <div className="relative grid size-full place-items-center rounded-full bg-surface ring-[3px] ring-[#050d18] text-xl font-bold text-white">
              +
            </div>
          </div>
          <p className="truncate text-[12px] font-medium text-white">Tu nota</p>
        </button>

        {uniqueEntries.map((entry) => {
          return (
            <Link
              key={entry.userId}
              href={`/mensajes/${entry.username}`}
              className="group min-w-20 max-w-24 shrink-0 text-center"
              title={`Abrir chat con ${entry.username}`}
            >
              <p className="mx-auto mb-1.5 line-clamp-2 min-h-9 rounded-2xl bg-white/14 px-2 py-1 text-[10px] leading-tight text-white/90">
                {entry.content}
              </p>
              {(entry.song_title || entry.song_artist) && (
                <p className="mx-auto mb-1.5 line-clamp-1 min-h-5 rounded-xl bg-[#1b1233] px-2 py-1 text-[9px] leading-tight text-fuchsia-200">
                  ♪ {entry.song_title || "Canción"}{entry.song_artist ? ` · ${entry.song_artist}` : ""}
                </p>
              )}
              <div className="relative mx-auto mb-1 size-[58px] rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-500 p-[2px] transition group-hover:scale-[1.03]">
                <div className="relative size-full overflow-hidden rounded-full bg-surface ring-[3px] ring-[#050d18]">
                  <Image
                    src={entry.avatar_url || "/demo-reddit.png"}
                    alt={entry.nickname || entry.username}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              </div>
              <p className="truncate text-[12px] font-medium text-white">{entry.nickname || entry.username}</p>
            </Link>
          );
        })}

        {uniqueEntries.length === 0 && (
          <p className="px-2 py-5 text-sm text-white/70">Aún no tienes notas porque no hay chats activos.</p>
        )}
      </div>

      {!canInteract && <p className="mt-2 text-xs text-brand">Inicia sesión para publicar notas.</p>}

      {isPublishing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h3 className="text-base font-semibold">Publicar nota</h3>
            <p className="mt-1 text-xs opacity-70">Tu nota aparecerá aquí durante 24 horas.</p>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              maxLength={180}
              rows={3}
              className="mt-3 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
              placeholder="Escribe tu nota..."
            />
            <div className="mt-1 text-right text-[11px] opacity-70">{noteText.length}/180</div>

            <div className="mt-3 grid gap-2">
              <input
                type="text"
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                maxLength={120}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
                placeholder="Canción (opcional)"
              />
              <input
                type="text"
                value={songArtist}
                onChange={(event) => setSongArtist(event.target.value)}
                maxLength={120}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
                placeholder="Artista (opcional)"
              />
              <input
                type="url"
                value={songUrl}
                onChange={(event) => setSongUrl(event.target.value)}
                maxLength={500}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
                placeholder="Enlace de la canción (opcional)"
              />
            </div>

            {publishError && <p className="mt-2 text-xs text-red-400">{publishError}</p>}
            <div className="mt-4 flex justify-between gap-2">
              <button
                type="button"
                onClick={deleteNote}
                disabled={isSaving || !myNote}
                className="inline-flex h-9 items-center justify-center rounded-full border border-red-400/70 px-4 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Borrar nota
              </button>
              <div className="flex justify-end gap-2">
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
                  onClick={publishNote}
                  disabled={isSaving}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
