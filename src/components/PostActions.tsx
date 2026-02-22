"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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

type ShareTarget = {
  type: "direct" | "group";
  id: number;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
};

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [shareTargets, setShareTargets] = useState<ShareTarget[]>([]);

  const [likedState, setLiked] = useState(!!liked);
  const [likesState, setLikes] = useState(likes);

  const [repostedState, setReposted] = useState(!!reposted);
  const [repostsState, setReposts] = useState(reposts ?? 0);
  const [savedState, setSavedState] = useState(false);

  const filteredTargets = useMemo(() => {
    const query = shareQuery.trim().toLowerCase();
    if (!query) return shareTargets;
    return shareTargets.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
  }, [shareQuery, shareTargets]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("treddit:saved-posts");
      const parsed = raw ? (JSON.parse(raw) as number[]) : [];
      setSavedState(parsed.includes(postId));
    } catch {
      setSavedState(false);
    }
  }, [postId]);

  async function loadShareTargets() {
    setLoadingTargets(true);
    try {
      const res = await fetch("/api/messages/share-targets", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      setShareTargets(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setShareTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  }

  function toggleSaved() {
    if (!canInteract) return;
    try {
      const raw = localStorage.getItem("treddit:saved-posts");
      const parsed = raw ? (JSON.parse(raw) as number[]) : [];
      const set = new Set(parsed);
      if (set.has(postId)) {
        set.delete(postId);
        setSavedState(false);
      } else {
        set.add(postId);
        setSavedState(true);
      }
      localStorage.setItem("treddit:saved-posts", JSON.stringify([...set]));
    } catch {
      setSavedState((prev) => !prev);
    }
  }

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

  async function openShare() {
    if (!canInteract) {
      alert(t.login);
      return;
    }
    setShowShareModal(true);
    setShareQuery("");
    await loadShareTargets();
  }

  async function sendPostTo(target: ShareTarget) {
    setShareBusy(true);
    const postUrl = new URL(`/p/${postId}`, window.location.origin).toString();
    const text = `Te compartieron este post\n${postUrl}`;

    try {
      const endpoint = target.type === "group" ? `/api/messages/groups/${target.id}/messages` : "/api/messages";
      const payload = target.type === "group" ? { text } : { recipientId: target.id, text };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setShowShareModal(false);
    } catch {
      alert("No se pudo compartir este post");
    } finally {
      setShareBusy(false);
    }
  }

  const btnBase =
    "group inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 transition";
  const iconBase = "size-5 opacity-80 group-hover:opacity-100";
  const textBase = "text-sm opacity-80 group-hover:opacity-100";

  return (
    <>
      <div className="flex items-center justify-between pr-1 mt-2 select-none">
        <button
          className={`${btnBase} hover:text-blue-400`}
          title={t.comments}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-comments", { detail: { postId } }));
            document
              .getElementById(`comments-${postId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
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

        <button
          className={`${btnBase} ${savedState ? "text-amber-400" : "hover:text-amber-400"}`}
          title={savedState ? "Quitar de guardados" : "Guardar publicación"}
          disabled={!canInteract}
          onClick={toggleSaved}
        >
          <IconBookmark className={`${iconBase}`} />
        </button>

        <button className={`${btnBase}`} title={t.share} onClick={openShare}>
          <IconShare className={`${iconBase}`} />
        </button>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">Compartir en chats o grupos</h3>
              <button className="text-sm opacity-70" onClick={() => setShowShareModal(false)}>Cerrar</button>
            </div>
            <input
              value={shareQuery}
              onChange={(event) => setShareQuery(event.target.value)}
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              placeholder="Buscar chat o grupo"
            />
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border/70">
              {loadingTargets && <p className="p-3 text-sm opacity-70">Cargando chats…</p>}
              {!loadingTargets && filteredTargets.length === 0 && (
                <p className="p-3 text-sm opacity-70">No tienes chats o grupos para compartir.</p>
              )}
              {!loadingTargets && filteredTargets.map((target) => (
                <button
                  key={`${target.type}-${target.id}`}
                  className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-2 text-left hover:bg-muted/40"
                  onClick={() => void sendPostTo(target)}
                  disabled={shareBusy}
                >
                  {target.avatarUrl ? (
                    <Image src={target.avatarUrl} alt={target.title} width={34} height={34} className="size-8 rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs">
                      {target.type === "group" ? "👥" : "@"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{target.title}</p>
                    <p className="text-xs opacity-65">{target.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
