"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

import PostCard, { Post as PostCardType } from "./PostCard";

type FeedProps = {
  canInteract: boolean;
  source?: string;
  userId?: number;
  likesOf?: number;
  limit?: number;
  filter?: string;
  communityId?: number;
  tag?: string;
  username?: string;
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
  filter,
  communityId,
  tag,
  username,
  initialItems,
}: FeedProps) {
  const { strings } = useLocale();
  const [posts, setPosts] = useState<PostCardType[]>(dedupePosts(initialItems || []));
  const [loading, setLoading] = useState(initialItems?.length ? false : true);
  const [hasError, setHasError] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));

    if (userId) params.set("userId", String(userId));
    if (likesOf) params.set("likesOf", String(likesOf));
    if (communityId) params.set("communityId", String(communityId));
    if (username) params.set("username", username);
    if (tag) params.set("tag", tag.startsWith("#") ? tag : `#${tag}`);

    if (source && !userId && !likesOf) {
      const [kind, id] = source.split(":");
      if (kind === "user" && id) params.set("userId", id);
      if (kind === "likes" && id) params.set("likesOf", id);
    }

    if (filter) params.set("filter", filter);

    return params.toString();
  }, [source, userId, likesOf, limit, filter, communityId, tag, username]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setHasError(false);
      try {
        const url = query ? `/api/posts?${query}` : "/api/posts";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!alive) return;
        const normalized = Array.isArray(data.items) ? data.items : [];
        setPosts(dedupePosts(normalized));
      } catch (error: unknown) {
        if (!alive) return;
        console.error("Feed load error:", error);
        setHasError(true);
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

  if (loading && posts.length === 0) {
    return <p className="p-4">{strings.feed.loading}</p>;
  }

  if (hasError) {
    return <p className="p-4 text-red-500">{strings.feed.error}</p>;
  }

  if (errMsg) {
    return <p className="p-4 text-red-500">{errMsg}</p>;
  }

  if (!loading && posts.length === 0) {
    return <p className="p-4">{strings.feed.empty}</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} canInteract={canInteract} />
      ))}
    </div>
  );
}

function dedupePosts(list: PostCardType[]) {
  const seen = new Set<number>();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
