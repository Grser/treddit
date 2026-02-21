"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";
import UserBadges from "./UserBadges";
import MentionUserLink from "./MentionUserLink";

type CommentNode = {
  id: number;
  userId: number;
  username: string;
  nickname: string;
  avatar_url?: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
  text: string;
  created_at: string;
  parentId?: number | null;
  replies: CommentNode[];
};

type MentionUser = { id: number; username: string; nickname: string | null };

export default function CommentsThread({
  postId,
  canInteract,
}: {
  postId: number;
  canInteract: boolean;
}) {
  const { strings } = useLocale();
  const t = strings.comments;
  const [tree, setTree] = useState<CommentNode[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?postId=${postId}`, { cache: "no-store" });
      const data = await res.json();
      setTree(data || []);
    } catch {
      setTree([]);
    }
  }, [postId]);

  useEffect(() => {
    function onOpen(event: Event) {
      const customEvent = event as CustomEvent<{ postId?: number }>;
      if (customEvent.detail?.postId === postId) {
        setOpen(true);
      }
    }

    window.addEventListener("open-comments", onOpen);
    return () => window.removeEventListener("open-comments", onOpen);
  }, [postId]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  useEffect(() => {
    const match = text.match(/(?:^|\s)@([\p{L}\p{N}_]{1,32})$/u);
    setMentionQuery(match ? match[1] : "");
  }, [text]);

  useEffect(() => {
    if (!canInteract || !mentionQuery.trim()) {
      setMentionResults([]);
      setMentionsLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setMentionsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json().catch(() => ({ items: [] }))) as { items?: MentionUser[] };
        if (!active) return;
        setMentionResults(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!active) return;
        setMentionResults([]);
      } finally {
        if (active) setMentionsLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [canInteract, mentionQuery]);

  function insertMention(username: string) {
    setText((prev) => prev.replace(/(?:^|\s)@[\p{L}\p{N}_]{1,32}$/u, (full) => `${full[0] === " " ? " " : ""}@${username} `));
    setMentionQuery("");
    setMentionResults([]);
  }

  async function addRoot() {
    if (!canInteract || !text.trim() || busy) return;
    setBusy(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text: text.trim() }),
      });
      setText("");
      setMentionQuery("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm opacity-70 hover:opacity-100 hover:underline"
      >
        {t.showComments}
      </button>
    );
  }

  if (tree === null) return <p className="text-sm opacity-70">{t.loading}</p>;

  return (
    <div className="mt-3">
      {canInteract && (
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <textarea
              className="flex-1 resize-none rounded-md bg-input p-2 text-sm outline-none ring-1 ring-border focus:ring-2"
              placeholder={t.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              disabled={busy}
            />
            <button
              onClick={addRoot}
              disabled={busy || !text.trim()}
              className="h-9 rounded-full bg-brand px-3 text-sm text-white disabled:opacity-50"
            >
              {t.add}
            </button>
          </div>
          {(mentionsLoading || mentionResults.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mentionsLoading && <span className="text-xs opacity-60">Buscando personas…</span>}
              {mentionResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user.username)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/60"
                >
                  {user.nickname || user.username} <span className="opacity-70">@{user.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <CommentList nodes={tree} postId={postId} canInteract={canInteract} onReplied={load} />
    </div>
  );
}

function CommentList({
  nodes,
  postId,
  canInteract,
  onReplied,
}: {
  nodes: CommentNode[];
  postId: number;
  canInteract: boolean;
  onReplied: () => void;
}) {
  const { strings } = useLocale();
  if (!nodes?.length) return <p className="text-sm opacity-70">{strings.comments.none}</p>;
  return (
    <ul className="space-y-3">
      {nodes.map((n) => (
        <CommentItem key={n.id} node={n} postId={postId} canInteract={canInteract} onReplied={onReplied} />
      ))}
    </ul>
  );
}

function CommentItem({
  node,
  postId,
  canInteract,
  onReplied,
}: {
  node: CommentNode;
  postId: number;
  canInteract: boolean;
  onReplied: () => void;
}) {
  const { strings } = useLocale();
  const t = strings.comments;
  const badges = strings.badges;
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);

  const avatar = node.avatar_url?.trim() || "/demo-reddit.png";

  useEffect(() => {
    const match = replyText.match(/(?:^|\s)@([\p{L}\p{N}_]{1,32})$/u);
    setMentionQuery(match ? match[1] : "");
  }, [replyText]);

  useEffect(() => {
    if (!replyOpen || !canInteract || !mentionQuery.trim()) {
      setMentionResults([]);
      setMentionsLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setMentionsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json().catch(() => ({ items: [] }))) as { items?: MentionUser[] };
        if (!active) return;
        setMentionResults(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!active) return;
        setMentionResults([]);
      } finally {
        if (active) setMentionsLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [replyOpen, canInteract, mentionQuery]);

  function insertReplyMention(username: string) {
    setReplyText((prev) => prev.replace(/(?:^|\s)@[\p{L}\p{N}_]{1,32}$/u, (full) => `${full[0] === " " ? " " : ""}@${username} `));
    setMentionResults([]);
    setMentionQuery("");
  }

  async function reply() {
    if (!canInteract || !replyText.trim()) {
      if (!canInteract) location.assign("/auth/login");
      return;
    }
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        text: replyText.trim(),
        parentId: node.id,
      }),
    });
    setReplyText("");
    setReplyOpen(false);
    onReplied();
  }

  return (
    <li className="flex gap-2">
      <Image
        src={avatar}
        className="mt-0.5 size-7 rounded-full object-cover ring-1 ring-border"
        alt={node.nickname || node.username}
        width={28}
        height={28}
        unoptimized
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="inline-flex flex-wrap items-center gap-2">
            <MentionUserLink username={node.username} text={node.nickname || node.username} className="font-medium hover:underline" />
            <UserBadges size="sm" isAdmin={node.is_admin} isVerified={node.is_verified} labels={badges} />
            <MentionUserLink username={node.username} text={`@${node.username}`} className="opacity-60 hover:underline" />
            <span className="text-xs opacity-60">{new Date(node.created_at).toLocaleString()}</span>
          </span>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm">{renderCommentText(node.text)}</p>

        <div className="mt-1">
          <button
            className="text-xs opacity-70 hover:opacity-100 hover:underline"
            onClick={() =>
              canInteract ? setReplyOpen((v) => !v) : (location.href = "/auth/login")
            }
          >
            {t.reply}
          </button>
        </div>

        {replyOpen && (
          <div className="mt-2">
            <div className="flex items-start gap-2">
              <textarea
                className="flex-1 resize-none rounded-md bg-input p-2 text-sm outline-none ring-1 ring-border focus:ring-2"
                placeholder={t.replyPlaceholder}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
              />
              <button
                className="h-8 rounded-full bg-brand px-3 text-sm text-white disabled:opacity-50"
                onClick={reply}
                disabled={!replyText.trim()}
              >
                {t.send}
              </button>
            </div>
            {(mentionsLoading || mentionResults.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mentionsLoading && <span className="text-xs opacity-60">Buscando personas…</span>}
                {mentionResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertReplyMention(user.username)}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/60"
                  >
                    {user.nickname || user.username} <span className="opacity-70">@{user.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {node.replies?.length > 0 && (
          <div className="mt-2 border-l border-border/60 pl-4">
            <CommentList nodes={node.replies} postId={postId} canInteract={canInteract} onReplied={onReplied} />
          </div>
        )}
      </div>
    </li>
  );
}

function renderCommentText(text: string) {
  const parts = text.split(/([#@][\p{L}\p{N}_]+)/gu);
  return parts.map((part, index) => {
    if (/^#[\p{L}\p{N}_]+$/u.test(part)) {
      return (
        <a key={`tag-${index}-${part}`} href={`/buscar?q=${encodeURIComponent(part)}`} className="font-semibold text-brand hover:underline">
          {part}
        </a>
      );
    }

    if (/^@[\p{L}\p{N}_]+$/u.test(part)) {
      const username = part.slice(1);
      return <MentionUserLink key={`mention-${index}-${part}`} username={username} text={part} />;
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
}
