"use client";

import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

export default function PostMenu({
  postId,
  isOwner,
}: {
  postId: number;
  isOwner: boolean;
}) {
  const { strings } = useLocale();
  const t = strings.postMenu;
  const [open, setOpen] = useState(false);

  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
          {isOwner ? (
            <>
              <MenuItem onClick={() => location.assign(`/p/${postId}/edit`)}>
                {t.edit}
              </MenuItem>
              <MenuItem onClick={() => location.assign(`/p/${postId}/stats`)}>{t.stats}</MenuItem>
            </>
          ) : (
            <MenuItem
              danger
              onClick={async () => {
                const res = await fetch(`/api/posts/${postId}/report`, { method: "POST" });
                if (!res.ok) {
                  const payload = (await res.json().catch(() => ({}))) as { error?: string };
                  alert(payload.error || "No se pudo reportar el post");
                  return;
                }
                setOpen(false);
                alert("Reporte enviado. Gracias por avisar.");
              }}
            >
              Reportar post
            </MenuItem>
          )}
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
