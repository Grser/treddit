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
  const [isBanned, setIsBanned] = useState(false);
  const [appealMessage, setAppealMessage] = useState("");
  const [sendingAppeal, setSendingAppeal] = useState(false);
  const [appealFeedback, setAppealFeedback] = useState<string | null>(null);

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
        if (res.status === 403) {
          const errorText = typeof data?.error === "string" ? data.error.toLowerCase() : "";
          if (errorText.includes("banead")) {
            setIsBanned(true);
            setAppealFeedback(null);
          }
        }
        throw new Error(data.error || t.joinError);
      }
      const nextValue = !joined;
      setJoined(nextValue);
      if (!nextValue) {
        setIsBanned(false);
        setAppealFeedback(null);
      }
      onChange?.(nextValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message || t.joinError);
    } finally {
      setLoading(false);
    }
  }

  async function submitAppeal() {
    if (sendingAppeal) return;
    const message = appealMessage.trim();
    if (message.length < 10) {
      setAppealFeedback(t.banAppealTooShort);
      return;
    }

    setSendingAppeal(true);
    setAppealFeedback(null);
    try {
      const res = await fetch("/api/communities/ban-appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((typeof data?.error === "string" ? data.error : null) || t.banAppealError);
      }
      setAppealFeedback(t.banAppealSuccess);
      setAppealMessage("");
    } catch (error) {
      setAppealFeedback(error instanceof Error ? error.message : t.banAppealError);
    } finally {
      setSendingAppeal(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-3">
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

      {isBanned && !joined && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-left">
          <p className="text-sm font-medium text-red-700">{t.banAppealTitle}</p>
          <p className="mt-1 text-xs text-red-700/90">{t.banAppealDescription}</p>
          <textarea
            className="mt-3 min-h-24 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder={t.banAppealPlaceholder}
            maxLength={500}
            value={appealMessage}
            onChange={(event) => setAppealMessage(event.target.value)}
          />
          <button
            type="button"
            onClick={submitAppeal}
            disabled={sendingAppeal}
            className="mt-2 inline-flex h-9 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sendingAppeal ? t.banAppealSending : t.banAppealSubmit}
          </button>
          {appealFeedback && <p className="mt-2 text-xs text-red-800">{appealFeedback}</p>}
        </div>
      )}
    </div>
  );
}
