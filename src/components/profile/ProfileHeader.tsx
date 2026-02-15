"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

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
  canMessage = false,
  messageHref = null,
}: {
  viewerId?: number | null;
  user: ProfileUser;
  stats: ProfileStats;
  initiallyFollowing?: boolean;
  canMessage?: boolean;
  messageHref?: string | null;
}) {
  const { strings } = useLocale();
  const isOwner = viewerId === user.id;
  const avatar = user?.avatar_url?.trim() || "/demo-reddit.png";
  const displayName = user?.nickname?.trim() || user.username;
  const [followers, setFollowers] = useState(stats.followers);
  const followerLabel = useMemo(() => Math.max(0, followers), [followers]);

  return (
    <section className="mt-0">
      {/* Banner */}
      <div className="relative h-52 w-full overflow-hidden bg-muted sm:h-64 md:h-72">
        {user.banner_url ? (
          <Image
            src={user.banner_url}
            className="object-cover object-center"
            alt=""
            fill
            sizes="100vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-brand/40 via-brand/20 to-transparent" aria-hidden="true" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-3 sm:bottom-5 sm:left-6 sm:translate-x-0">
          <div className="relative size-20 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-lg sm:size-24 md:size-28">
            <Image
              src={avatar}
              className="object-cover"
              alt=""
              fill
              sizes="112px"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="relative z-10 -mt-10 border-b border-border bg-gradient-to-b from-black/70 via-surface/95 to-surface px-4 pb-4 pt-10 sm:-mt-12 sm:px-6 sm:pt-12 md:-mt-14 md:pt-14">
        <div className="flex justify-end gap-2">
          {!isOwner && (
            <>
              {canMessage && messageHref && (
                <a
                  href={messageHref}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
                >
                  {strings.navbar.messages}
                </a>
              )}
              <FollowButton
                userId={user.id}
                canInteract={Boolean(viewerId)}
                initiallyFollowing={initiallyFollowing}
                variant="outline"
                onFollowChange={(value) => {
                  setFollowers((prev) => Math.max(0, prev + (value ? 1 : -1)));
                }}
              />
            </>
          )}
          {isOwner && (
            <a
              href={`/u/${user.username}/edit`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm"
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
          <Link href={`/u/${user.username}/siguiendo`} className="hover:underline">
            <b>{stats.following}</b> Siguiendo
          </Link>
          <Link href={`/u/${user.username}/seguidores`} className="hover:underline">
            <b>{followerLabel}</b> Seguidores
          </Link>
        </div>
      </div>
    </section>
  );
}
