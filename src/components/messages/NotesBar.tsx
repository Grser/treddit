import Image from "next/image";
import Link from "next/link";

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
  className?: string;
};

export default function NotesBar({ entries, className }: Props) {
  const uniqueEntries = entries
    .filter((entry, index, arr) => arr.findIndex((item) => item.userId === entry.userId) === index)
    .slice(0, 12);

  return (
    <section className={`rounded-2xl border border-border bg-surface p-3 sm:p-4 ${className ?? ""}`.trim()}>
      <div className="mb-3">
        <h2 className="font-semibold">Notas</h2>
        <p className="text-xs opacity-70">Estado rápido de tus chats</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
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
    </section>
  );
}
