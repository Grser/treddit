"use client";

import { useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

export default function JoinCommunityButton({
  communityId,
  initiallyMember,
  canInteract,
  onChange,
}: {
  communityId: number;
  initiallyMember: boolean;
  canInteract: boolean;
  onChange?: (joined: boolean) => void;
}) {
  const { strings } = useLocale();
  const t = strings.communityPage;
  const [joined, setJoined] = useState(initiallyMember);
  const [loading, setLoading] = useState(false);

  async function toggleMembership() {
    if (loading) return;
    if (!canInteract) {
      window.location.assign("/auth/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/communities/join", {
        method: joined ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });
      if (res.status === 401) {
        window.location.assign("/auth/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.joinError);
      }
      const nextValue = !joined;
      setJoined(nextValue);
      onChange?.(nextValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message || t.joinError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggleMembership}
      disabled={loading}
      className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${
        joined
          ? "bg-muted text-foreground hover:bg-muted/80 focus:ring-muted"
          : "bg-brand text-white hover:bg-brand/90 focus:ring-brand/50"
      }`}
      type="button"
    >
      {joined ? t.leave : t.join}
    </button>
  );
}
