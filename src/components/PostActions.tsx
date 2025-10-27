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
  const [busy, setBusy] = useState(false);

  const [likedState, setLiked] = useState(!!liked);
  const [likesState, setLikes] = useState(likes);

  const [repostedState, setReposted] = useState(!!reposted);
  const [repostsState, setReposts] = useState(reposts ?? 0);

  async function toggleLike() {
    if (!canInteract || busy) return;
    setBusy(true);

    // Optimista
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
      // Alinea con backend
      if (typeof j.liked === "boolean") setLiked(j.liked);
      if (typeof j.likes === "number") setLikes(j.likes);
    } catch {
      // revertir
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

    // Optimista
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
      // revertir
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
        alert("Enlace copiado");
      } catch {
        window.prompt("Copia el enlace", url);
      }
    }
  }

  const btnBase =
    "group inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 transition";
  const iconBase = "size-5 opacity-80 group-hover:opacity-100";
  const textBase = "text-sm opacity-80 group-hover:opacity-100";

  return (
    <div className="flex items-center justify-between pr-1 mt-2 select-none">
      {/* Comentarios (solo navegación/scroll) */}
      <button
        className={`${btnBase} hover:text-blue-400`}
        title="Comentarios"
        onClick={() =>
          document
            .getElementById(`comments-${postId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      >
        <IconComment className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(comments)}</span>
      </button>

      {/* Repost (verde) */}
      <button
        className={`${btnBase} ${
          repostedState ? "text-emerald-400" : "hover:text-emerald-400"
        }`}
        disabled={!canInteract || busy}
        onClick={toggleRepost}
        title={
          canInteract
            ? repostedState
              ? "Quitar repost"
              : "Repostear"
            : "Inicia sesión"
        }
      >
        <IconRepost className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(repostsState)}</span>
      </button>

      {/* Like (rosa) */}
      <button
        className={`${btnBase} ${
          likedState ? "text-pink-500" : "hover:text-pink-500"
        }`}
        disabled={!canInteract || busy}
        onClick={toggleLike}
        title={
          canInteract
            ? likedState
              ? "Quitar me gusta"
              : "Me gusta"
            : "Inicia sesión"
        }
      >
        <IconHeart className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(likesState)}</span>
      </button>

      {/* Vistas (placeholder) */}
      <div className={`${btnBase}`}>
        <IconStats className={`${iconBase}`} />
        <span className={`${textBase}`}>{formatCount(views)}</span>
      </div>

      {/* Guardar (a implementar) */}
      <button className={`${btnBase}`} title="Guardar (próximamente)" disabled>
        <IconBookmark className={`${iconBase}`} />
      </button>

      {/* Compartir */}
      <button className={`${btnBase}`} title="Compartir" onClick={share}>
        <IconShare className={`${iconBase}`} />
      </button>
    </div>
  );
}
