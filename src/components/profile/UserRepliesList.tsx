"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

type ReplyItem = {
  id: number;
  text: string;
  created_at: string;
  post: {
    id: number;
    description?: string | null;
    username: string;
    nickname?: string | null;
    avatar_url?: string | null;
    is_admin?: boolean;
    is_verified?: boolean;
  };
};

export default function UserRepliesList({ userId }: { userId: number }) {
  const { strings } = useLocale();
  const labels = strings.profilePage;
  const [items, setItems] = useState<ReplyItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => `/api/profile/replies?userId=${userId}`, [userId]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setError(null);
      setItems(null);
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { items: ReplyItem[] };
        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        console.error("Failed to load replies", err);
        if (!alive) return;
        setError(labels.replies.error);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [endpoint, labels.replies.error]);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (items === null) {
    return <p className="text-sm opacity-70">{labels.replies.loading}</p>;
  }

  if (!items.length) {
    return <p className="text-sm opacity-70">{labels.empty.replies}</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-foreground/70">
            <span>
              {labels.replies.respondedTo}{" "}
              <a className="text-brand hover:underline" href={`/u/${item.post.username}`}>
                @{item.post.username}
              </a>
            </span>
            <time dateTime={item.created_at} className="text-foreground/60">
              {new Date(item.created_at).toLocaleString()}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.text}</p>

          <a
            href={`/p/${item.post.id}`}
            className="mt-3 block rounded-lg border border-border bg-muted/40 p-3 transition hover:border-brand/70 hover:bg-brand/5"
          >
            <p className="text-sm font-semibold">
              {item.post.nickname?.trim() || item.post.username}
            </p>
            <p className="text-xs opacity-70">@{item.post.username}</p>
            {item.post.description && (
              <p className="mt-2 text-sm opacity-80 line-clamp-3 whitespace-pre-wrap">
                {item.post.description}
              </p>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
