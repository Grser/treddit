"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import UserBadges from "@/components/UserBadges";

type PreviewUser = {
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  followers: number;
  following: number;
  is_admin?: boolean;
  is_verified?: boolean;
};

export default function UserHoverPreview({
  username,
  children,
  className,
}: {
  username: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<PreviewUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleOpen = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(true);
    if (!loaded) {
      setLoaded(true);
      fetch(`/api/users/preview?username=${encodeURIComponent(username)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.item) setUser(json.item as PreviewUser);
        })
        .catch(() => null);
    }
  };

  const handleClose = () => {
    timerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <span className={`relative inline-block ${className || ""}`} onMouseEnter={handleOpen} onMouseLeave={handleClose}>
      {children}

      {open && (
        <span className="absolute left-0 top-full z-40 mt-2 block w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <span className="relative block aspect-[3/1] w-full bg-muted">
            {user?.banner_url ? (
              <Image src={user.banner_url} alt="" fill className="object-cover" unoptimized />
            ) : (
              <span className="absolute inset-0 block bg-gradient-to-r from-brand/50 via-brand/20 to-transparent" />
            )}
          </span>

          <span className="relative block p-3 pt-4">
            <span className="absolute -top-8 left-3 block size-16 overflow-hidden rounded-full border-2 border-surface bg-surface">
              <Image
                src={user?.avatar_url?.trim() || "/demo-reddit.png"}
                alt={user?.nickname || user?.username || username}
                fill
                className="object-cover"
                unoptimized
              />
            </span>
            <span className="block pl-20">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                {user?.nickname || user?.username || username}
                <UserBadges size="sm" isAdmin={user?.is_admin} isVerified={user?.is_verified} />
              </span>
              <span className="block text-xs opacity-70">@{user?.username || username}</span>
            </span>
            {user?.description && <span className="mt-3 block line-clamp-3 text-sm">{user.description}</span>}
            <span className="mt-3 flex gap-3 text-xs opacity-80">
              <span>
                <b>{user?.following ?? 0}</b> Siguiendo
              </span>
              <span>
                <b>{user?.followers ?? 0}</b> Seguidores
              </span>
            </span>
            <Link href={`/u/${encodeURIComponent(username)}`} className="mt-3 inline-flex text-xs text-blue-400 hover:underline">
              Ver perfil
            </Link>
          </span>
        </span>
      )}
    </span>
  );
}
