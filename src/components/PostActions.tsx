"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactElement } from "react";
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

type ExternalSharePlatform = "x" | "telegram" | "whatsapp" | "facebook" | "copy";

const externalShareOptions: Array<{
  id: ExternalSharePlatform;
  label: string;
  className: string;
  title: string;
  icon: ReactElement;
}> = [
  {
    id: "x",
    label: "X",
    className: "bg-zinc-800",
    title: "Compartir por X",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.9L6 22H2.9l7.3-8.4L1 2h6.2l4.3 6.2L18.9 2Zm-2.1 17.3h1.7L6.2 4.6H4.4l12.4 14.7Z" />
      </svg>
    ),
  },
  {
    id: "telegram",
    label: "Telegram",
    className: "bg-sky-500",
    title: "Compartir por Telegram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
        <path d="m21.6 4.4-3.1 14.7c-.2 1-1 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.2.2-.4.4-.8.4l.3-4.9L18.1 6c.4-.4-.1-.6-.6-.3L6.8 12.4l-4.6-1.4c-1-.3-1-.9.2-1.3l17.8-6.9c.8-.3 1.5.2 1.3 1.6Z" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    className: "bg-emerald-500",
    title: "Compartir por WhatsApp",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
        <path d="M20.5 3.5A11 11 0 0 0 3.7 17.1L2 22l5-1.6A11 11 0 1 0 20.5 3.5ZM12 20.2c-1.7 0-3.3-.5-4.7-1.4l-.3-.2-3 .9 1-2.9-.2-.3a8.7 8.7 0 1 1 7.2 3.9Zm4.8-6.5c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.8.2l-.6.8c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.3-1.6-1.4-1.9-.1-.3 0-.4.1-.6l.5-.5.2-.3.1-.2c.1-.2.1-.4 0-.6l-.8-2c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.6.1-.8.4-.3.3-1 1-.9 2.4.1 1.4 1 2.7 1.2 2.9.2.2 2 3 4.9 4.2.7.3 1.3.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.8-.8 2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.4Z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    className: "bg-blue-600",
    title: "Compartir por Facebook",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
        <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2V8h-1.5c-1.5 0-2 1-2 1.9V12h3.4l-.6 3.5h-2.8v8.4A12 12 0 0 0 24 12Z" />
      </svg>
    ),
  },
  {
    id: "copy",
    label: "Copiar link",
    className: "bg-zinc-700",
    title: "Copiar enlace",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11 4.9" />
        <path d="M14 11a5 5 0 0 0-7.1 0L4.1 13.8a5 5 0 1 0 7.1 7.1l1.8-1.8" />
      </svg>
    ),
  },
];

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
  const [selectedTargets, setSelectedTargets] = useState<Record<string, ShareTarget>>({});
  const [shareMessage, setShareMessage] = useState("");

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
    setSelectedTargets({});
    setShareMessage("");
    await loadShareTargets();
  }

  function buildPostUrl() {
    return new URL(`/p/${postId}`, window.location.origin).toString();
  }

  function buildText(postUrl: string) {
    const customMessage = shareMessage.trim();
    return customMessage ? `${customMessage}\n${postUrl}` : `Te compartieron este post\n${postUrl}`;
  }

  function openExternalShare(platform: ExternalSharePlatform) {
    const postUrl = buildPostUrl();
    const text = buildText(postUrl);
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(text);
    const base =
      platform === "x"
        ? `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
        : platform === "telegram"
          ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
          : platform === "whatsapp"
            ? `https://wa.me/?text=${encodedText}`
              : platform === "facebook"
                ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
                : "";

    if (platform === "copy") {
      void navigator.clipboard.writeText(postUrl).then(() => alert("Enlace copiado"));
      return;
    }

    window.open(base, "_blank", "noopener,noreferrer");
  }

  function toggleTarget(target: ShareTarget) {
    const key = `${target.type}-${target.id}`;
    setSelectedTargets((prev) => {
      if (prev[key]) {
        const clone = { ...prev };
        delete clone[key];
        return clone;
      }
      return { ...prev, [key]: target };
    });
  }

  async function sendPostToTargets() {
    const targets = Object.values(selectedTargets);
    if (targets.length === 0) return;
    setShareBusy(true);
    const postUrl = buildPostUrl();
    const text = buildText(postUrl);

    try {
      for (const target of targets) {
        const endpoint = target.type === "group" ? `/api/messages/groups/${target.id}/messages` : "/api/messages";
        const payload = target.type === "group" ? { text } : { recipientId: target.id, text };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
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
              <h3 className="text-base font-semibold">Enviar a amigos</h3>
              <button className="text-sm opacity-70" onClick={() => setShowShareModal(false)}>Cerrar</button>
            </div>
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              {externalShareOptions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openExternalShare(item.id)}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-xs font-semibold text-white ${item.className}`}
                  title={item.title}
                  aria-label={item.title}
                >
                  {item.icon}
                </button>
              ))}
            </div>
            <input
              value={shareQuery}
              onChange={(event) => setShareQuery(event.target.value)}
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              placeholder="Buscar"
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
                  onClick={() => toggleTarget(target)}
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
                  <span
                    className={`ml-auto inline-flex size-6 items-center justify-center rounded-full border ${
                      selectedTargets[`${target.type}-${target.id}`]
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-border text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-border/70 pt-3">
              <input
                value={shareMessage}
                onChange={(event) => setShareMessage(event.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                placeholder="Escribe un mensaje..."
                maxLength={200}
              />
              <div className="mt-3 flex justify-end">
                <button
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => void sendPostToTargets()}
                  disabled={shareBusy || Object.keys(selectedTargets).length === 0}
                >
                  Enviar ({Object.keys(selectedTargets).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
