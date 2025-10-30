import UserBadges from "@/components/UserBadges";

export default function ProfileHeader({
  user,
  stats,
  viewerId,
}: {
  viewerId?: number | null;
  user: any;
  stats: { posts: number; followers: number; following: number };
}) {
  const isOwner = viewerId === user.id;
  const avatar = user?.avatar_url?.trim() || "/demo-reddit.png";
  const displayName = user?.nickname?.trim() || user.username;

  return (
    <section>
      {/* Banner */}
      <div className="relative h-44 w-full bg-muted">
        {user.banner_url && <img src={user.banner_url} className="h-full w-full object-cover" alt="" />}
        <div className="absolute -bottom-12 left-4">
          <img src={avatar} className="size-24 rounded-full ring-2 ring-surface object-cover" alt="" />
        </div>
      </div>

      {/* Info */}
      <div className="border-b border-border px-4 pb-4 pt-14">
        <div className="flex justify-end">
          {isOwner && (
            <a
              href={`/u/${user.username}/edit`}
              className="h-9 rounded-full border border-border px-4 text-sm"
            >
              Editar perfil
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{displayName}</h1>
          <UserBadges isAdmin={user.is_admin} isVerified={user.is_verified} />
        </div>
        <p className="opacity-70">@{user.username}</p>
        {user.description && <p className="mt-2 whitespace-pre-wrap">{user.description}</p>}

        <div className="mt-2 flex gap-4 text-sm opacity-80">
          {user.location && <span>{user.location}</span>}
          {user.website && (
            <a className="hover:underline" href={user.website} target="_blank" rel="noreferrer">
              {user.website}
            </a>
          )}
          <span>Se unió el {new Date(user.created_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-2 flex gap-4 text-sm">
          <span>
            <b>{stats.following}</b> Siguiendo
          </span>
          <span>
            <b>{stats.followers}</b> Seguidores
          </span>
        </div>
      </div>
    </section>
  );
}
