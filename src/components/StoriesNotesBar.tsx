"use client";

import Image from "next/image";

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
  const withMe = me
    ? [{ id: me.id, username: me.username, nickname: "Tu historia", avatar_url: me.avatar_url ?? null }, ...users]
    : users;

  const uniqueUsers = withMe.filter((user, index, arr) => arr.findIndex((item) => item.id === user.id) === index).slice(0, 12);

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
    </section>
  );
}
