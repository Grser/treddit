"use client";

import { useEffect, useState } from "react";

import PostCard, { type Post as PostCardType } from "@/components/PostCard";

type SavedPostsFeedProps = {
  canInteract: boolean;
};

type SavedPostsResponse = {
  items: PostCardType[];
};

const STORAGE_KEY = "treddit:saved-posts";

export default function SavedPostsFeed({ canInteract }: SavedPostsFeedProps) {
  const [posts, setPosts] = useState<PostCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as number[]) : [];
        const ids = parsed.filter((value): value is number => Number.isInteger(value) && value > 0).slice(-100).reverse();

        if (ids.length === 0) {
          if (alive) {
            setPosts([]);
            setLoading(false);
          }
          return;
        }

        const res = await fetch(`/api/posts/saved?ids=${ids.join(",")}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as SavedPostsResponse;
        if (!alive) return;
        setPosts(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!alive) return;
        setError("No se pudieron cargar tus guardados.");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        load();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (loading) {
    return <p className="text-sm opacity-70">Cargando guardados...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (posts.length === 0) {
    return <p className="text-sm opacity-70">Aún no tienes publicaciones guardadas.</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} canInteract={canInteract} />
      ))}
    </div>
  );
}
