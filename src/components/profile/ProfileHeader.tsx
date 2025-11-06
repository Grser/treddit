"use client";

import { useMemo, useState } from "react";

import FollowButton from "@/components/follow/FollowButton";
import UserBadges from "@/components/UserBadges";

type ProfileUser = {
  id: number;
  username: string;
  nickname?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  created_at: string | Date;
  is_admin?: boolean;
  is_verified?: boolean;
};

type ProfileStats = { posts: number; followers: number; following: number };

export default function ProfileHeader({
  user,
  stats,
  viewerId,
  initiallyFollowing = false,
}: {
  viewerId?: number | null;
  user: ProfileUser;
  stats: ProfileStats;
  initiallyFollowing?: boolean;
}) {
  const isOwner = viewerId === user.id;
  const avatar = user?.avatar_url?.trim() || "/demo-reddit.png";
  const displayName = user?.nickname?.trim() || user.username;
  const [followers, setFollowers] = useState(stats.followers);
  const followerLabel = useMemo(() => Math.max(0, followers), [followers]);

  return (
    <section className="bg-surface">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {user.banner_url ? (
          <img src={user.banner_url} className="absolute inset-0 h-full w-full object-cover" alt="" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-brand/40 via-brand/20 to-transparent" aria-hidden="true" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-4 left-4 flex items-end gap-3 sm:bottom-6 sm:left-6">
          <div className="relative size-28 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-lg">
            <img src={avatar} className="absolute inset-0 h-full w-full object-cover" alt="" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="border-b border-border px-4 pb-4 pt-20 sm:px-6">
        <div className="flex justify-end gap-2">
          {!isOwner && (
            <FollowButton
              userId={user.id}
              canInteract={Boolean(viewerId)}
              initiallyFollowing={initiallyFollowing}
              variant="outline"
              onFollowChange={(value) => {
                setFollowers((prev) => Math.max(0, prev + (value ? 1 : -1)));
              }}
            />
          )}
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
            <b>{followerLabel}</b> Seguidores
          </span>
        </div>
      </div>
    </section>
  );
}
