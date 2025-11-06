"use client";

import { useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

export type FollowButtonVariant = "primary" | "outline";

export default function FollowButton({
  userId,
  initiallyFollowing = false,
  canInteract,
  variant = "primary",
  size = "md",
  onFollowChange,
}: {
  userId: number;
  initiallyFollowing?: boolean;
  canInteract: boolean;
  variant?: FollowButtonVariant;
  size?: "sm" | "md";
  onFollowChange?: (following: boolean) => void;
}) {
  const { strings } = useLocale();
  const t = strings.sidebarRight;
  const [following, setFollowing] = useState(initiallyFollowing);
  const [hover, setHover] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseClasses =
    variant === "outline"
      ? "border border-border bg-transparent text-blue-400 hover:bg-muted/60"
      : "bg-brand text-white hover:bg-brand/90";
  const focusRing = variant === "outline" ? "focus:ring-blue-400/40" : "focus:ring-brand/40";
  const sizeClasses = size === "sm" ? "h-8 px-3 text-sm" : "h-9 px-4 text-sm";

  async function toggle() {
    if (loading) return;
    if (!canInteract) {
      window.location.assign("/auth/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.status === 401) {
        window.location.assign("/auth/login");
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message =
          typeof payload.error === "string"
            ? payload.error
            : following
            ? t.unfollowError
            : t.followError;
        throw new Error(message);
      }
      const next = !following;
      setFollowing(next);
      onFollowChange?.(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message || (following ? t.unfollowError : t.followError));
    } finally {
      setLoading(false);
    }
  }

  const label = following
    ? hover
      ? t.unfollow
      : t.following
    : t.follow;

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full transition focus:outline-none focus:ring-2 disabled:opacity-60 ${baseClasses} ${sizeClasses} ${focusRing}`}
      title={following ? t.unfollowTitle : t.followTitle}
    >
      {label}
    </button>
  );
}
