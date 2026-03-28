"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type FollowRequestItem = {
  id: number;
  requesterId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function FollowRequestsPanel({ initialItems }: { initialItems: FollowRequestItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function resolve(requestId: number, action: "approve" | "reject") {
    if (busyId) return;
    setBusyId(requestId);
    try {
      const res = await fetch("/api/follows/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo procesar la solicitud");
      }
      setItems((prev) => prev.filter((item) => item.id !== requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message || "No se pudo procesar la solicitud");
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Solicitudes para seguirte</h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const avatar = item.avatar_url?.trim() || "/demo-reddit.png";
          return (
            <li key={item.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <Image
                  src={avatar}
                  alt={item.nickname || item.username}
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover ring-1 ring-border"
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    <Link href={`/u/${item.username}`} className="hover:underline">
                      {item.nickname || item.username}
                    </Link>
                  </p>
                  <p className="text-xs opacity-70">@{item.username}</p>
                  <p className="text-xs opacity-60">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolve(item.id, "reject")}
                    disabled={busyId === item.id}
                    className="h-8 rounded-full border border-border px-3 text-xs hover:bg-muted/60 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(item.id, "approve")}
                    disabled={busyId === item.id}
                    className="h-8 rounded-full bg-brand px-3 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
