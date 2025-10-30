"use client";

import { useEffect, useMemo, useState } from "react";
import PostCard, { Post as PostCardType } from "./PostCard";

type FeedProps = {
  canInteract: boolean;
  /** "user:123", "likes:123" o undefined para Home */
  source?: string;
  /** Alternativas explícitas al source */
  userId?: number;
  likesOf?: number;
  limit?: number;
  /** Elementos precargados desde el servidor (SSR) */
  initialItems?: PostCardType[];
};

type ApiResponse = { items: PostCardType[]; nextCursor: string | null };

export default function Feed({
  canInteract,
  source,
  userId,
  likesOf,
  limit = 20,
  initialItems,
}: FeedProps) {
  const [posts, setPosts] = useState<PostCardType[]>(initialItems || []);
  const [loading, setLoading] = useState(initialItems?.length ? false : true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Normaliza el source a query params para /api/posts
  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));

    if (userId) params.set("userId", String(userId));
    if (likesOf) params.set("likesOf", String(likesOf));

    if (source && !userId && !likesOf) {
      const [kind, id] = source.split(":");
      if (kind === "user" && id) params.set("userId", id);
      if (kind === "likes" && id) params.set("likesOf", id);
    }

    return params.toString();
  }, [source, userId, likesOf, limit]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErrMsg(null);
      try {
        const url = query ? `/api/posts?${query}` : "/api/posts";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!alive) return;
        setPosts(Array.isArray(data.items) ? data.items : []);
      } catch (error: unknown) {
        if (!alive) return;
        console.error("Feed load error:", error);
        setErrMsg("No se pudieron cargar las publicaciones.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [query]);

  if (loading && posts.length === 0) return <p className="p-4">Cargando…</p>;
  if (errMsg) return <p className="p-4 text-red-500">{errMsg}</p>;
  if (!loading && posts.length === 0)
    return <p className="p-4">Aún no hay publicaciones.</p>;

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} canInteract={canInteract} />
      ))}
    </div>
  );
}
