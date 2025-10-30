"use client";

import { useLocale } from "@/contexts/LocaleContext";
import UserBadges from "./UserBadges";

type Trend = { tag: string; count: number };
type UserRec = {
  id: number;
  username: string;
  nickname: string;
  avatar_url?: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
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
  const { strings } = useLocale();
  const t = strings.sidebarRight;
  const badges = strings.badges;

  return (
    <aside className="w-80 hidden lg:flex flex-col gap-4 p-4 border-l border-border">
      <div className="bg-surface rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t.happening}</h2>
          <a href="/explorar" className="text-sm text-blue-400 hover:underline">
            {t.seeAll}
          </a>
        </div>
        <ul className="mt-2 space-y-2 text-sm">
          {trending.slice(0, 5).map((trend) => (
            <li key={trend.tag} className="truncate">
              {trend.tag}
            </li>
          ))}
          {trending.length === 0 && <li className="opacity-60">{t.noTrends}</li>}
        </ul>
      </div>

      <div className="bg-surface rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t.whoToFollow}</h2>
          <a href="/gente" className="text-sm text-blue-400 hover:underline">
            {t.seeAll}
          </a>
        </div>

        <ul className="mt-3 space-y-3">
          {recommended.slice(0, 6).map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3">
              <a
                href={`/u/${user.username}`}
                className="flex items-center gap-3 min-w-0"
                title={t.viewProfile(user.username)}
              >
                <img
                  src={user.avatar_url || "/demo-reddit.png"}
                  alt={user.nickname || user.username}
                  className="size-10 rounded-full object-cover bg-muted/40 ring-1 ring-border"
                />
                <div className="min-w-0">
                  <p className="font-semibold leading-tight truncate flex items-center gap-1">
                    {user.username}
                    <UserBadges
                      size="sm"
                      isAdmin={user.is_admin}
                      isVerified={user.is_verified}
                      labels={badges}
                    />
                  </p>
                  <p className="text-sm opacity-70 leading-tight truncate">
                    {user.nickname || `@${user.username}`}
                  </p>
                </div>
              </a>

              <FollowButton userId={user.id} canInteract={canInteract} />
            </li>
          ))}

          {recommended.length === 0 && (
            <li className="opacity-60 text-sm">{t.noSuggestions}</li>
          )}
        </ul>
      </div>
    </aside>
  );
}

function FollowButton({ userId, canInteract }: { userId: number; canInteract: boolean }) {
  const { strings } = useLocale();
  const t = strings.sidebarRight;

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
      alert(j.error || t.followError);
      return;
    }
    (document.activeElement as HTMLButtonElement | null)?.blur();
  }

  return (
    <button
      onClick={follow}
      className="h-8 px-3 rounded-full text-sm text-blue-400 ring-1 ring-transparent hover:ring-blue-400/40"
      title={t.followTitle}
      type="button"
    >
      {t.follow}
    </button>
  );
}
