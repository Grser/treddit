export default function ProfileHeader({
    user, stats, viewerId,
  }: {
    viewerId?: number | null;
    user: any;
    stats: { posts: number; followers: number; following: number };
  }) {
    const isOwner = viewerId === user.id;
  
    return (
      <section>
        {/* Banner */}
        <div className="h-44 w-full bg-muted relative">
          {user.banner_url && <img src={user.banner_url} className="h-full w-full object-cover" alt="" />}
          <div className="absolute -bottom-12 left-4">
            <img src={user.avatar_url || "/demo-reddit.png"} className="size-24 rounded-full ring-2 ring-surface object-cover" alt="" />
          </div>
        </div>
  
        {/* Info */}
        <div className="px-4 pt-14 pb-4 border-b border-border">
          <div className="flex justify-end">{isOwner && (
            <a href={`/u/${user.username}/edit`} className="h-9 px-4 rounded-full border border-border text-sm">Editar perfil</a>
          )}</div>
  
          <h1 className="text-xl font-bold">{user.nickname}</h1>
          <p className="opacity-70">@{user.username}</p>
          {user.description && <p className="mt-2 whitespace-pre-wrap">{user.description}</p>}
  
          <div className="mt-2 text-sm opacity-80 flex gap-4">
            {user.location && <span>{user.location}</span>}
            {user.website && <a className="hover:underline" href={user.website} target="_blank">{user.website}</a>}
            <span>Se unió el {new Date(user.created_at).toLocaleDateString()}</span>
          </div>
  
          <div className="mt-2 text-sm flex gap-4">
            <span><b>{stats.following}</b> Siguiendo</span>
            <span><b>{stats.followers}</b> Seguidores</span>
          </div>
        </div>
      </section>
    );
  }
  