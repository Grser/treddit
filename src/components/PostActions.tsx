"use client";
import { useState } from "react";
import {
  IconBookmark,
  IconComment,
  IconHeart,
  IconRepost,
  IconShare,
  IconStats,
} from "./icons";
import { formatCount } from "@/lib/format";
import { useLocale } from "@/contexts/LocaleContext";

export default function PostActions({
  postId,
  canInteract,
  initial: { likes, liked, comments, reposts, reposted, views = 0 },
}: {
  postId: number;
  canInteract: boolean;
  initial: {
    likes: number;
    liked?: boolean;
    comments: number;
    reposts?: number;
    reposted?: boolean;
    views?: number;
  };
}) {
  const { strings } = useLocale();
  const t = strings.postActions;
  const [busy, setBusy] = useState(false);

  const [likedState, setLiked] = useState(!!liked);
  const [likesState, setLikes] = useState(likes);

  const [repostedState, setReposted] = useState(!!reposted);
  const [repostsState, setReposts] = useState(reposts ?? 0);

  async function toggleLike() {
    if (!canInteract || busy) return;
    setBusy(true);

    setLiked((v) => !v);
    setLikes((n) => (likedState ? n - 1 : n + 1));

    try {
      const res = await fetch("/api/likes/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          action: likedState ? "unlike" : "like",
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      if (typeof j.liked === "boolean") setLiked(j.liked);
      if (typeof j.likes === "number") setLikes(j.likes);
    } catch {
      setLiked((v) => !v);
      setLikes((n) => (likedState ? n + 1 : n - 1));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRepost() {
    if (!canInteract || busy) return;
    setBusy(true);

    const willUnrepost = repostedState;

    setReposted((v) => !v);
    setReposts((n) => (willUnrepost ? Math.max(0, n - 1) : n + 1));

    try {
      const res = await fetch("/api/posts/repost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          action: willUnrepost ? "unrepost" : "repost",
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      if (typeof j.reposted === "boolean") setReposted(j.reposted);
      if (typeof j.reposts === "number") setReposts(j.reposts);
    } catch {
      setReposted((v) => !v);
      setReposts((n) => (willUnrepost ? n + 1 : Math.max(0, n - 1)));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = new URL(`/p/${postId}`, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        /* cancelado */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert(t.linkCopied);
      } catch {
        window.prompt(t.copyPrompt, url);
      }
    }
  }

  const btnBase =
    "group inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 transition";
  const iconBase = "size-5 opacity-80 group-hover:opacity-100";
  const textBase = "text-sm opacity-80 group-hover:opacity-100";

  return (
    <div className="flex items-center justify-between pr-1 mt-2 select-none">
      <button
        className={`${btnBase} hover:text-blue-400`}
        title={t.comments}
        onClick={() =>
          document
            .getElementById(`comments-${postId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      >
        <IconComment className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(comments)}</span>
      </button>

      <button
        className={`${btnBase} ${repostedState ? "text-emerald-400" : "hover:text-emerald-400"}`}
        disabled={!canInteract || busy}
        onClick={toggleRepost}
        title={
          canInteract ? (repostedState ? t.undoRepost : t.repost) : t.login
        }
      >
        <IconRepost className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(repostsState)}</span>
      </button>

      <button
        className={`${btnBase} ${likedState ? "text-pink-500" : "hover:text-pink-500"}`}
        disabled={!canInteract || busy}
        onClick={toggleLike}
        title={canInteract ? (likedState ? t.unlike : t.like) : t.login}
      >
        <IconHeart className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(likesState)}</span>
      </button>

      <div className={`${btnBase}`} title={t.views}>
        <IconStats className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(views)}</span>
      </div>

      <button className={`${btnBase}`} title={t.saveComingSoon} disabled>
        <IconBookmark className={`${iconBase}`} />
      </button>

      <button className={`${btnBase}`} title={t.share} onClick={share}>
        <IconShare className={`${iconBase}`} />
      </button>
    </div>
  );
}
