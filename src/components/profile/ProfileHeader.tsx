"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  country_of_origin?: string | null;
  is_age_verified?: boolean;
};

type ProfileStats = { posts: number; followers: number; following: number };
type CloseFriendCandidate = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  isClose: boolean;
};

export default function ProfileHeader({
  user,
  stats,
  viewerId,
  initiallyFollowing = false,
  canMessage = false,
  messageHref = null,
  initiallyBlocked = false,
}: {
  viewerId?: number | null;
  user: ProfileUser;
  stats: ProfileStats;
  initiallyFollowing?: boolean;
  canMessage?: boolean;
  messageHref?: string | null;
  initiallyBlocked?: boolean;
}) {
  const { strings } = useLocale();
  const isOwner = viewerId === user.id;
  const avatar = user?.avatar_url?.trim() || "/demo-reddit.png";
  const banner = user?.banner_url?.trim() || null;
  const displayName = user?.nickname?.trim() || user.username;
  const [followers, setFollowers] = useState(stats.followers);
  const [isBlocked, setIsBlocked] = useState(initiallyBlocked);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [closeFriendsLoading, setCloseFriendsLoading] = useState(false);
  const [closeFriendCandidates, setCloseFriendCandidates] = useState<CloseFriendCandidate[]>([]);
  const [closeFriendsError, setCloseFriendsError] = useState<string | null>(null);
  const followerLabel = useMemo(() => Math.max(0, followers), [followers]);

  useEffect(() => {
    if (!isOwner || !showCloseFriends) return;
    let active = true;
    setCloseFriendsLoading(true);
    setCloseFriendsError(null);
    fetch("/api/close-friends", { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json().catch(() => ({}))) as { items?: CloseFriendCandidate[]; error?: string };
        if (!active) return;
        if (!res.ok) throw new Error(payload.error || "No se pudo cargar tu lista");
        setCloseFriendCandidates(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch((error) => {
        if (!active) return;
        setCloseFriendsError(error instanceof Error ? error.message : "No se pudo cargar tu lista");
      })
      .finally(() => {
        if (active) setCloseFriendsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOwner, showCloseFriends]);

  return (
    <section className="mt-0">
      <div className="relative overflow-hidden border-b border-border bg-surface/95 px-4 pb-4 pt-4 sm:px-6">
        <div className="absolute inset-0">
          {banner ? (
            <Image src={banner} alt={`Banner de ${displayName}`} fill className="object-cover" sizes="100vw" unoptimized />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-sky-900/30 via-violet-900/20 to-fuchsia-900/30" />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="flex items-end gap-3">
          <div className="relative z-10 size-20 overflow-hidden rounded-full bg-surface shadow-lg sm:size-24 md:size-28">
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
      <div className="relative z-10 bg-surface/95 px-4 pb-4 pt-4 sm:px-6">
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
              <button
                type="button"
                disabled={!viewerId || isBlockLoading}
                onClick={async () => {
                  if (!viewerId) return;
                  setIsBlockLoading(true);
                  try {
                    const method = isBlocked ? "DELETE" : "POST";
                    const res = await fetch("/api/blocks", {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.id }),
                    });
                    if (!res.ok) {
                      const payload = await res.json().catch(() => ({}));
                      throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo actualizar el bloqueo");
                    }
                    setIsBlocked((prev) => !prev);
                    if (!isBlocked) {
                      window.location.reload();
                    }
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "No se pudo actualizar el bloqueo");
                  } finally {
                    setIsBlockLoading(false);
                  }
                }}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBlockLoading ? "..." : isBlocked ? "Desbloquear" : "Bloquear"}
              </button>
            </>
          )}
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => setShowCloseFriends(true)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
              >
                Mejores amigos
              </button>
              <a
                href={`/u/${user.username}/edit`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm"
              >
                Editar perfil
              </a>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{displayName}</h1>
          <UserBadges isAdmin={user.is_admin} isVerified={user.is_verified} />
        </div>
        <p className="opacity-70">@{user.username}</p>
        {user.description && <p className="mt-2 whitespace-pre-wrap">{user.description}</p>}

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-80">
          {user.location && <span>{user.location}</span>}
          {user.country_of_origin && <span>País: {user.country_of_origin}</span>}
          <span>Edad: {user.is_age_verified ? "Verificada" : "Sin verificar"}</span>
          {user.website && (
            <a className="hover:underline" href={user.website} target="_blank" rel="noreferrer">
              {user.website}
            </a>
          )}
          <span>Se unió el {new Date(user.created_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <Link href={`/u/${user.username}/siguiendo`} className="hover:underline">
            <b>{stats.following}</b> Siguiendo
          </Link>
          <Link href={`/u/${user.username}/seguidores`} className="hover:underline">
            <b>{followerLabel}</b> Seguidores
          </Link>
        </div>
      </div>
      {showCloseFriends && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Mejores amigos</h2>
              <button type="button" onClick={() => setShowCloseFriends(false)} className="rounded-full border border-border px-3 py-1 text-xs">Cerrar</button>
            </div>
            <p className="mb-3 text-xs opacity-75">Puedes agregar solo cuentas que sigues. Ellos podrán responder posts marcados como “Mejores amigos”.</p>
            {closeFriendsLoading && <p className="text-sm opacity-70">Cargando lista…</p>}
            {closeFriendsError && <p className="text-sm text-rose-400">{closeFriendsError}</p>}
            {!closeFriendsLoading && !closeFriendsError && (
              <ul className="hide-scrollbar max-h-80 space-y-2 overflow-y-auto">
                {closeFriendCandidates.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.nickname || item.username}</p>
                      <p className="truncate text-xs opacity-70">@{item.username}</p>
                    </div>
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.isClose ? "border-brand/60 bg-brand/20" : "border-border"}`}
                      onClick={async () => {
                        setCloseFriendsError(null);
                        const method = item.isClose ? "DELETE" : "POST";
                        const res = await fetch("/api/close-friends", {
                          method,
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: item.id }),
                        });
                        const payload = (await res.json().catch(() => ({}))) as { error?: string };
                        if (!res.ok) {
                          setCloseFriendsError(payload.error || "No se pudo actualizar");
                          return;
                        }
                        setCloseFriendCandidates((prev) =>
                          prev.map((entry) => (entry.id === item.id ? { ...entry, isClose: !entry.isClose } : entry)),
                        );
                      }}
                    >
                      {item.isClose ? "Quitar" : "Agregar"}
                    </button>
                  </li>
                ))}
                {closeFriendCandidates.length === 0 && (
                  <li className="rounded-xl border border-border/60 bg-background/30 px-3 py-4 text-center text-sm opacity-70">
                    Aún no sigues a nadie para agregar aquí.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
