"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function getYoutubeEmbedUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return null;
  }

  return null;
}

function getSpotifyEmbedUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "");
    if (!host.includes("spotify.com")) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const trackIndex = parts.findIndex((part) => part === "track");
    const trackId = trackIndex >= 0 ? parts[trackIndex + 1] : null;

    if (!trackId) return null;
    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
  } catch {
    return null;
  }
}

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
  song_lyrics?: string | null;
  created_at?: string;
};

type Props = {
  notes: NoteItem[];
  canInteract?: boolean;
  className?: string;
  me?: {
    id: number;
    username: string;
    avatar_url?: string | null;
  } | null;
};

export default function NotesBar({ notes, canInteract = true, className, me = null }: Props) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [notes],
  );
  const myNotes = useMemo(() => (me ? sortedNotes.filter((entry) => entry.userId === me.id) : []), [me, sortedNotes]);
  const myNote = myNotes[0] || null;
  const uniqueEntries = useMemo(
    () => sortedNotes
      .filter((entry) => entry.userId !== me?.id)
      .filter((entry, index, arr) => arr.findIndex((item) => item.userId === entry.userId) === index)
      .slice(0, 14),
    [me?.id, sortedNotes],
  );
  const selectedNoteYoutubeUrl = getYoutubeEmbedUrl(selectedNote?.song_url);
  const selectedNoteSpotifyUrl = getSpotifyEmbedUrl(selectedNote?.song_url);

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
          song_url: songUrl.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo publicar tu nota.");
        return;
      }

      setNoteText("");
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
    <section className={`rounded-3xl border border-border/80 bg-surface/90 p-2.5 shadow-sm sm:p-3 ${className ?? ""}`.trim()}>
      <div className="flex items-start gap-3 overflow-x-auto px-1 pb-1 pt-0.5">
        <button
          type="button"
          onClick={() => {
            if (!canInteract) {
              router.push("/auth/login");
              return;
            }
            if (myNote) {
              setSelectedNote(myNote);
              setIsActionsOpen(false);
              return;
            }
            setNoteText("");
            setSongUrl("");
            setPublishError(null);
            setIsPublishing(true);
          }}
          className="group min-w-[78px] max-w-[86px] shrink-0"
          title={canInteract ? (myNote ? "Ver tu nota" : "Publicar nota") : "Inicia sesión para publicar notas"}
        >
          <div className="relative mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-fuchsia-500 to-violet-600 p-[2px] transition group-hover:scale-[1.03]">
            <div className="relative size-full overflow-hidden rounded-full bg-surface ring-[2.5px] ring-[var(--color-surface)]">
              <Image src={myNote?.avatar_url || me?.avatar_url || "/demo-reddit.png"} alt={me?.username || "Tu nota"} fill sizes="64px" className="object-cover" />
            </div>
            <div className="absolute -top-4 left-1/2 w-[92px] -translate-x-1/2 rounded-2xl bg-[#101828] px-2 py-1 text-center text-[10px] font-medium leading-tight text-white shadow-lg line-clamp-2">
              {myNote?.content || "Comparte una nota"}
            </div>
          </div>
          <p className="mt-2 truncate text-center text-[12px] font-medium text-foreground">Tu nota</p>
        </button>

        {uniqueEntries.map((entry) => {
          const isSelf = me?.id === entry.userId;
          return (
            <button
              key={entry.userId}
              type="button"
              onClick={() => {
                setSelectedNote(entry);
                setIsActionsOpen(false);
              }}
              className="group min-w-[78px] max-w-[86px] shrink-0"
              title={isSelf ? "Ver tu nota" : `Ver nota de ${entry.username}`}
            >
              <div className="relative mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-fuchsia-500 to-violet-600 p-[2px] transition group-hover:scale-[1.03]">
                <div className="relative size-full overflow-hidden rounded-full bg-surface ring-[2.5px] ring-[var(--color-surface)]">
                  <Image src={entry.avatar_url || "/demo-reddit.png"} alt={entry.nickname || entry.username} fill sizes="64px" className="object-cover" />
                </div>
                <div className="absolute -top-4 left-1/2 w-[92px] -translate-x-1/2 rounded-2xl bg-[#101828] px-2 py-1 text-center text-[10px] font-medium leading-tight text-white shadow-lg line-clamp-2">
                  {entry.content}
                </div>
              </div>
              <p className="mt-2 truncate text-center text-[12px] font-medium text-foreground">{isSelf ? "Tú" : entry.nickname || entry.username}</p>
            </button>
          );
        })}

        {sortedNotes.length === 0 && <p className="px-2 py-6 text-sm text-foreground/70">Aún no tienes notas porque no hay chats activos.</p>}
      </div>

      {!canInteract && <p className="mt-2 text-xs text-brand">Inicia sesión para publicar notas.</p>}

      {isPublishing && (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4">
          <div className="w-full rounded-t-3xl border border-border bg-surface p-4 pb-6 sm:max-w-md sm:rounded-3xl sm:p-5">
            <h3 className="text-base font-semibold">Publicar nota</h3>
            <p className="mt-1 text-xs opacity-70">Tu nota aparecerá durante 24 horas.</p>
            <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={180} rows={3} className="mt-3 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40" placeholder="Comparte algo breve..." />
            <div className="mt-1 text-right text-[11px] opacity-70">{noteText.length}/180</div>

            <div className="mt-3 grid gap-2">
              <input type="url" value={songUrl} onChange={(event) => setSongUrl(event.target.value)} maxLength={500} className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40" placeholder="Enlace de canción (opcional)" />
            </div>

            {publishError && <p className="mt-2 text-xs text-red-400">{publishError}</p>}
            <div className="mt-4 flex justify-between gap-2">
              <button type="button" onClick={deleteNote} disabled={isSaving || !myNote} className="inline-flex h-10 items-center justify-center rounded-full border border-red-400/70 px-4 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50">Borrar nota</button>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsPublishing(false); setPublishError(null); }} className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm">Cancelar</button>
                <button type="button" onClick={publishNote} disabled={isSaving} className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Publicando..." : "Publicar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4">
          <div className="h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f1117] p-5 text-white sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-start gap-2">
              <div className="max-w-[85%]">
                <p className="text-[32px] font-semibold leading-none">{selectedNote.content}</p>
                {(selectedNote.song_title || selectedNote.song_artist) && (
                  <p className="mt-1 text-base font-medium text-fuchsia-200">♪ {selectedNote.song_title || "Canción"}{selectedNote.song_artist ? ` · ${selectedNote.song_artist}` : ""}</p>
                )}
              </div>
              <button type="button" onClick={() => setIsActionsOpen(true)} className="ml-auto rounded-full px-2 py-1 text-2xl leading-none text-white/90 hover:bg-white/10" aria-label="Opciones de la nota">⋯</button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative size-16 overflow-hidden rounded-full border border-white/20">
                <Image src={selectedNote.avatar_url || "/demo-reddit.png"} alt={selectedNote.nickname || selectedNote.username} fill sizes="64px" className="object-cover" />
              </div>
              <div>
                <p className="text-base font-semibold">{selectedNote.nickname || selectedNote.username}</p>
                <p className="text-xs text-white/65">Visible para seguidores en común.</p>
              </div>
            </div>

            {selectedNote.song_url && (
              <div className="mt-4 space-y-3">
                {selectedNoteYoutubeUrl ? (
                  <div className="overflow-hidden rounded-xl border border-white/15">
                    <iframe key={`yt-${selectedNote.id}`} src={selectedNoteYoutubeUrl} title={`Video de ${selectedNote.nickname || selectedNote.username}`} className="h-56 w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                  </div>
                ) : selectedNoteSpotifyUrl ? (
                  <div className="rounded-xl border border-white/15 bg-black/30 p-3">
                    <iframe
                      key={`sp-${selectedNote.id}`}
                      src={selectedNoteSpotifyUrl}
                      title={`Spotify de ${selectedNote.nickname || selectedNote.username}`}
                      className="h-[152px] w-full rounded-lg"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <audio key={`audio-${selectedNote.id}`} src={selectedNote.song_url} controls autoPlay className="mt-4 w-full" />
                )}
              </div>
            )}

            <div className="mt-5 space-y-2">
              {me?.id === selectedNote.userId && (
                <button type="button" onClick={() => {
                  if (!canInteract) {
                    router.push("/auth/login");
                    return;
                  }
                  const noteToEdit = selectedNote;
                  setNoteText(noteToEdit.content || "");
                  setSongUrl(noteToEdit.song_url || "");
                  setSelectedNote(null);
                  setIsPublishing(true);
                }} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white">Editar mi nota</button>
              )}
              {me?.id === selectedNote.userId && (
                <button type="button" onClick={async () => { await deleteNote(); setSelectedNote(null); }} className="inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-red-300">Eliminar nota</button>
              )}
              <button type="button" onClick={() => setSelectedNote(null)} className="inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-white/80">Cerrar</button>
            </div>
          </div>

          {isActionsOpen && (
            <div className="fixed inset-0 z-[81] grid place-items-end bg-black/40 p-4 sm:place-items-center" onClick={() => setIsActionsOpen(false)}>
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900" onClick={(event) => event.stopPropagation()}>
                {me?.id === selectedNote.userId && (
                  <button type="button" onClick={async () => { await deleteNote(); setIsActionsOpen(false); setSelectedNote(null); }} className="block h-12 w-full border-b border-white/10 text-center text-sm font-semibold text-red-400">Eliminar</button>
                )}
                <button type="button" onClick={() => setIsActionsOpen(false)} className="block h-12 w-full text-center text-sm text-white/90">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
