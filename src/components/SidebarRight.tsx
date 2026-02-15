"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";
import FollowButton from "./follow/FollowButton";
import UserBadges from "./UserBadges";

type Trend = { tag: string; count: number; views?: number };
type UserRec = {
  id: number;
  username: string;
  nickname: string | null;
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
  const [suggestions, setSuggestions] = useState(recommended);
  const originalById = useMemo(() => new Map(recommended.map((user) => [user.id, user])), [recommended]);

  useEffect(() => {
    setSuggestions(recommended);
  }, [recommended]);

  function handleFollowChange(userId: number, following: boolean) {
    setSuggestions((prev) => {
      if (following) {
        return prev.filter((item) => item.id !== userId);
      }
      const original = originalById.get(userId);
      if (!original) return prev;
      const filtered = prev.filter((item) => item.id !== userId);
      return [original, ...filtered];
    });
  }

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
              <a
                href={`/buscar?q=${encodeURIComponent(trend.tag)}`}
                className="flex flex-col rounded-lg border border-transparent px-2 py-1 transition hover:border-brand/60 hover:bg-brand/5"
              >
                <span className="font-semibold text-brand">{trend.tag}</span>
                <span className="text-xs opacity-70">
                  {Intl.NumberFormat().format(trend.views ?? trend.count)} visualizaciones · {trend.count} publicaciones
                </span>
              </a>
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
          {suggestions.slice(0, 6).map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3">
              <a
                href={`/u/${user.username}`}
                className="flex items-center gap-3 min-w-0"
                title={t.viewProfile(user.username)}
              >
                <Image
                  src={user.avatar_url || "/demo-reddit.png"}
                  alt={user.nickname || user.username}
                  width={40}
                  height={40}
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

              <FollowButton
                userId={user.id}
                canInteract={canInteract}
                size="sm"
                onFollowChange={(value) => handleFollowChange(user.id, value)}
              />
            </li>
          ))}

          {suggestions.length === 0 && (
            <li className="opacity-60 text-sm">{t.noSuggestions}</li>
          )}
        </ul>
      </div>
    </aside>
  );
}
