"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";
import UserBadges from "./UserBadges";

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
    load();
  }, [load]);

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
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (tree === null) return <p className="text-sm opacity-70">{t.loading}</p>;

  return (
    <div className="mt-3">
      {canInteract && (
        <div className="flex items-start gap-2 mb-3">
          <textarea
            className="flex-1 resize-none rounded-md bg-input text-sm p-2 outline-none ring-1 ring-border focus:ring-2"
            placeholder={t.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            disabled={busy}
          />
          <button
            onClick={addRoot}
            disabled={busy || !text.trim()}
            className="h-9 px-3 rounded-full bg-brand text-white text-sm disabled:opacity-50"
          >
            {t.add}
          </button>
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

  const avatar = node.avatar_url?.trim() || "/demo-reddit.png";

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
        className="size-7 rounded-full object-cover ring-1 ring-border mt-0.5"
        alt={node.nickname || node.username}
        width={28}
        height={28}
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="inline-flex flex-wrap items-center gap-2">
            <a href={`/u/${node.username}`} className="font-medium hover:underline">
              {node.nickname || node.username}
            </a>
            <UserBadges
              size="sm"
              isAdmin={node.is_admin}
              isVerified={node.is_verified}
              labels={badges}
            />
            <span className="opacity-60">@{node.username}</span>
            <span className="opacity-60 text-xs">{new Date(node.created_at).toLocaleString()}</span>
          </span>
        </p>
        <p className="text-sm whitespace-pre-wrap break-words">{node.text}</p>

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
          <div className="mt-2 flex items-start gap-2">
            <textarea
              className="flex-1 resize-none rounded-md bg-input text-sm p-2 outline-none ring-1 ring-border focus:ring-2"
              placeholder={t.replyPlaceholder}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
            />
            <button
              className="h-8 px-3 rounded-full bg-brand text-white text-sm disabled:opacity-50"
              onClick={reply}
              disabled={!replyText.trim()}
            >
              {t.send}
            </button>
          </div>
        )}

        {node.replies?.length > 0 && (
          <div className="mt-2 pl-4 border-l border-border/60">
            <CommentList nodes={node.replies} postId={postId} canInteract={canInteract} onReplied={onReplied} />
          </div>
        )}
      </div>
    </li>
  );
}
