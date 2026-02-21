"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type SummaryPayload = {
  unread?: number;
  total?: number;
  latest?: string | null;
};

function buildKey(payload: SummaryPayload | null) {
  if (!payload) return "";
  return `${Number(payload.total) || 0}:${Number(payload.unread) || 0}:${payload.latest || ""}`;
}

export default function MessagesRealtimeSync() {
  const router = useRouter();
  const lastKeyRef = useRef("");

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/messages/summary", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => null)) as SummaryPayload | null;
        if (!mounted || !payload) return;
        const nextKey = buildKey(payload);
        if (!nextKey) return;
        if (lastKeyRef.current && lastKeyRef.current !== nextKey) {
          router.refresh();
        }
        lastKeyRef.current = nextKey;
      } catch {
        // noop
      }
    }

    void poll();
    const intervalId = setInterval(poll, 3000);

    const onUpdated = () => {
      router.refresh();
      void poll();
    };

    window.addEventListener("treddit:messages-updated", onUpdated);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("treddit:messages-updated", onUpdated);
    };
  }, [router]);

  return null;
}
