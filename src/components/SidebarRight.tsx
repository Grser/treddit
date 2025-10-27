"use client";

type Trend = { tag: string; count: number };
type UserRec = {
  id: number;
  username: string;
  nickname: string;
  avatar_url?: string | null;
};

export default function SidebarRight({
  trending = [],
  recommended = [],
  canInteract = false,
}: {
  trending?: Trend[];
  recommended?: UserRec[];
  canInteract?: boolean;
}) {
  return (
    <aside className="w-80 hidden lg:flex flex-col gap-4 p-4 border-l border-border">
      {/* Qué está pasando */}
      <div className="bg-surface rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Qué está pasando</h2>
          <a href="/explorar" className="text-sm text-blue-400 hover:underline">
            Ver todo
          </a>
        </div>
        <ul className="mt-2 space-y-2 text-sm">
          {trending.slice(0, 5).map((t) => (
            <li key={t.tag} className="truncate">{t.tag}</li>
          ))}
          {trending.length === 0 && (
            <li className="opacity-60">Sin tendencias por ahora</li>
          )}
        </ul>
      </div>

      {/* A quién seguir */}
      <div className="bg-surface rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">A quién seguir</h2>
          <a href="/gente" className="text-sm text-blue-400 hover:underline">
            Ver todo
          </a>
        </div>

        <ul className="mt-3 space-y-3">
          {recommended.slice(0, 6).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3">
              {/* Bloque clicable: redirige al perfil */}
              <a
                href={`/u/${u.username}`}
                className="flex items-center gap-3 min-w-0"
                title={`Ir al perfil de @${u.username}`}
              >
                <img
                  src={u.avatar_url || "/demo-reddit.png"}
                  alt={u.nickname || u.username}
                  className="size-10 rounded-full object-cover bg-muted/40 ring-1 ring-border"
                />
                <div className="min-w-0">
                  <p className="font-semibold leading-tight truncate">{u.username}</p>
                  <p className="text-sm opacity-70 leading-tight truncate">
                    {u.nickname || `@${u.username}`}
                  </p>
                </div>
              </a>

              <FollowButton userId={u.id} canInteract={canInteract} />
            </li>
          ))}

          {recommended.length === 0 && (
            <li className="opacity-60 text-sm">Sin sugerencias</li>
          )}
        </ul>
      </div>
    </aside>
  );
}

/* Botón Seguir */
function FollowButton({ userId, canInteract }: { userId: number; canInteract: boolean }) {
  async function follow() {
    if (!canInteract) {
      location.assign("/auth/login");
      return;
    }
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.status === 401) {
      location.assign("/auth/login");
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "No se pudo seguir al usuario");
      return;
    }
    // Feedback simple: deshabilitar el botón activo
    (document.activeElement as HTMLButtonElement | null)?.blur();
  }

  return (
    <button
      onClick={follow}
      className="h-8 px-3 rounded-full text-sm text-blue-400 ring-1 ring-transparent hover:ring-blue-400/40"
      title="Seguir"
      type="button"
    >
      Seguir
    </button>
  );
}
