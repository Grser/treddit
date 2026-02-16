"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { InboxEntry } from "@/lib/inbox";

const NOTE_ROTATION = [
  "Disponible ahora ✨",
  "En línea por si quieres hablar",
  "Respondo rápido hoy",
  "Compartiéndo ideas nuevas",
  "Pasando a saludar 👋",
];

type Props = {
  entries: InboxEntry[];
  canInteract?: boolean;
  className?: string;
};

export default function NotesBar({ entries, canInteract = true, className }: Props) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const uniqueEntries = entries
    .filter((entry, index, arr) => arr.findIndex((item) => item.userId === entry.userId) === index)
    .slice(0, 12);

  async function publishNote() {
    const normalizedText = noteText.trim();
    if (!normalizedText) {
      setPublishError("Escribe algo para publicar tu nota.");
      return;
    }

    setIsSaving(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `📝 Nota: ${normalizedText}` }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPublishError(data.error || "No se pudo publicar tu nota.");
        return;
      }

      setNoteText("");
      setIsPublishing(false);
      router.refresh();
    } catch {
      setPublishError("No se pudo publicar tu nota.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={`rounded-2xl border border-border bg-surface p-3 sm:p-4 ${className ?? ""}`.trim()}>
      <div className="mb-3">
        <h2 className="font-semibold">Notas</h2>
        <p className="text-xs opacity-70">Estado rápido de tus chats</p>
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
          className="group min-w-24 max-w-28 shrink-0 text-center"
          title={canInteract ? "Publicar nota" : "Inicia sesión para publicar notas"}
        >
          <div className="relative mx-auto mb-1 grid size-14 place-items-center rounded-full ring-2 ring-brand/70 transition group-hover:scale-[1.03]">
            <div className="grid size-full place-items-center rounded-full bg-muted/40 text-xl font-bold">+</div>
          </div>
          <p className="truncate text-xs font-medium">Tu nota</p>
          <p className="line-clamp-2 text-[10px] leading-tight opacity-70">Publica un estado rápido</p>
        </button>

        {uniqueEntries.map((entry, index) => {
          const note = NOTE_ROTATION[index % NOTE_ROTATION.length];
          return (
            <Link
              key={entry.userId}
              href={`/mensajes/${entry.username}`}
              className="group min-w-24 max-w-28 shrink-0 text-center"
              title={`Abrir chat con ${entry.username}`}
            >
              <div className="relative mx-auto mb-1 size-14 overflow-hidden rounded-full ring-2 ring-border transition group-hover:scale-[1.03]">
                <Image
                  src={entry.avatar_url || "/demo-reddit.png"}
                  alt={entry.nickname || entry.username}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <p className="truncate text-xs font-medium">{entry.nickname || entry.username}</p>
              <p className="line-clamp-2 text-[10px] leading-tight opacity-70">{note}</p>
            </Link>
          );
        })}

        {uniqueEntries.length === 0 && (
          <p className="px-2 py-5 text-sm opacity-70">Aún no tienes notas porque no hay chats activos.</p>
        )}
      </div>

      {isPublishing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h3 className="text-base font-semibold">Publicar nota</h3>
            <p className="mt-1 text-xs opacity-70">Se publicará como un estado corto en el feed.</p>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              maxLength={180}
              rows={3}
              className="mt-3 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none ring-1 ring-transparent focus:border-brand/50 focus:ring-brand/40"
              placeholder="Escribe tu nota..."
            />
            <div className="mt-1 text-right text-[11px] opacity-70">{noteText.length}/180</div>
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
                onClick={publishNote}
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
