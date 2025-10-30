"use client";

import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

export default function PostMenu({
  postId,
  isOwner,
  isAdmin,
  pinned,
  replyScope,
}: {
  postId: number;
  isOwner: boolean;
  isAdmin: boolean;
  pinned?: boolean;
  replyScope?: 0 | 1 | 2;
}) {
  const { strings } = useLocale();
  const t = strings.postMenu;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function action(
    path: string,
    method: string = "POST",
    body?: Record<string, unknown>
  ) {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) alert(t.failure);
    else location.reload();
  }

  return (
    <div className="ml-auto relative" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="size-9 rounded-full hover:bg-muted/60 inline-grid place-items-center"
        title={t.more}
      >
        <span className="sr-only">{t.more}</span>
        <div className="flex gap-1">
          <span className="w-1 h-1 rounded-full bg-foreground/80" />
          <span className="w-1 h-1 rounded-full bg-foreground/80" />
          <span className="w-1 h-1 rounded-full bg-foreground/80" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface shadow-lg p-1 z-50">
          {(isOwner || isAdmin) && (
            <>
              <MenuItem onClick={() => location.assign(`/p/${postId}/edit`)}>
                {t.edit}
              </MenuItem>
              <MenuItem danger onClick={() => action(`/api/posts/${postId}`, "DELETE")}>
                {t.remove}
              </MenuItem>
              <Separator />
              <MenuItem
                onClick={() =>
                  action(`/api/posts/${postId}`, "PATCH", { op: pinned ? "unpin" : "pin" })
                }
              >
                {pinned ? t.unpin : t.pin}
              </MenuItem>
              <MenuItem onClick={() => action(`/api/posts/${postId}`, "PATCH", { op: "feature" })}>
                {t.feature}
              </MenuItem>
              <Separator />
            </>
          )}

          <MenuItem
            onClick={() =>
              action(`/api/posts/${postId}`, "PATCH", { op: "who_can_reply", value: ((replyScope ?? 0) + 1) % 3 })
            }
          >
            {t.changeReplies}
          </MenuItem>
          <MenuItem onClick={() => location.assign(`/embed/p/${postId}`)}>{t.embed}</MenuItem>
          <MenuItem onClick={() => location.assign(`/p/${postId}/stats`)}>{t.stats}</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded hover:bg-muted ${danger ? "text-red-500" : ""}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-border" />;
}
