"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  /** Cursor inicial para continuar el scroll infinito desde SSR */
  initialCursor?: string | null;
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
  initialCursor = null,
}: FeedProps) {
  const { strings } = useLocale();
  const [posts, setPosts] = useState<PostCardType[]>(dedupePosts(initialItems || []));
  const [loading, setLoading] = useState(initialItems?.length ? false : true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [pendingPosts, setPendingPosts] = useState<PostCardType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const skipFirstLoad = useRef(Boolean(initialItems?.length));
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const shouldShowExploringBoundary = !filter && !userId && !likesOf && !communityId && !tag && !username;

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
    const incoming = dedupePosts(initialItems || []);
    setPosts((prev) => {
      if (!incoming.length) return prev;
      if (!prev.length) return incoming;
      const prevIds = new Set(prev.map((item) => item.id));
      const latestKnownCreatedAt = prev.reduce((latest, item) => {
        const createdAt = getPostTimeMs(item);
        return createdAt && createdAt > latest ? createdAt : latest;
      }, 0);
      const highestKnownId = Math.max(...prev.map((item) => item.id));
      const freshFromRefresh = incoming.filter((item) => {
        if (prevIds.has(item.id)) return false;
        const createdAt = getPostTimeMs(item);
        if (createdAt) return createdAt > latestKnownCreatedAt;
        return item.id > highestKnownId;
      });
      if (!freshFromRefresh.length) return prev;
      return dedupePosts([...freshFromRefresh, ...prev]);
    });
    setPendingPosts((prev) => {
      if (!prev.length || !incoming.length) return prev;
      const incomingIds = new Set(incoming.map((item) => item.id));
      return prev.filter((item) => !incomingIds.has(item.id));
    });
    setLoading(false);
    setNextCursor(initialCursor ?? null);
  }, [initialItems, initialCursor]);

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return;
    }

    let alive = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setHasError(false);
      setErrMsg(null);
      try {
        const url = query ? `/api/posts?${query}` : "/api/posts";
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!alive) return;
        const normalized = Array.isArray(data.items) ? data.items : [];
        setPosts(dedupePosts(normalized));
        setNextCursor(data.nextCursor ?? null);
      } catch (error: unknown) {
        if (!alive || (error instanceof DOMException && error.name === "AbortError")) return;
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
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    let cancelled = false;

    const loadMore = async () => {
      if (!nextCursor || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        const params = new URLSearchParams(query);
        params.set("cursor", nextCursor);
        const res = await fetch(`/api/posts?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (cancelled) return;
        const normalized = Array.isArray(data.items) ? data.items : [];
        setPosts((prev) => dedupePosts([...prev, ...normalized]));
        setNextCursor(data.nextCursor ?? null);
      } catch (error) {
        if (!cancelled) {
          console.error("Feed load-more error:", error);
        }
      } finally {
        if (!cancelled) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      loadingMoreRef.current = false;
    };
  }, [query, nextCursor]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("treddit:new-posts-count", {
        detail: { count: pendingPosts.length },
      }),
    );
  }, [pendingPosts.length]);

  useEffect(() => {
    if (!posts.length) return;
    let active = true;
    let currentRequest: AbortController | null = null;

    async function checkNewPosts() {
      currentRequest?.abort();
      const controller = new AbortController();
      currentRequest = controller;
      try {
        const url = query ? `/api/posts?${query}` : "/api/posts";
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!active) return;
        const incoming = Array.isArray(data.items) ? dedupePosts(data.items) : [];
        if (!incoming.length) return;
        const existingIds = new Set([...posts, ...pendingPosts].map((item) => item.id));
        const latestKnownCreatedAt = [...posts, ...pendingPosts].reduce((latest, item) => {
          const createdAt = getPostTimeMs(item);
          return createdAt && createdAt > latest ? createdAt : latest;
        }, 0);
        const highestKnownId = [...posts, ...pendingPosts].reduce((max, item) => Math.max(max, item.id), 0);
        const fresh = incoming.filter((item) => {
          if (existingIds.has(item.id)) return false;
          const createdAt = getPostTimeMs(item);
          if (createdAt) return createdAt > latestKnownCreatedAt;
          return item.id > highestKnownId;
        });
        if (!fresh.length) return;
        setPendingPosts((prev) => dedupePosts([...fresh, ...prev]));
      } catch {
        if (controller.signal.aborted || !active) return;
      } finally {
        if (currentRequest === controller) {
          currentRequest = null;
        }
      }
    }

    const interval = setInterval(checkNewPosts, 12_000);
    return () => {
      active = false;
      currentRequest?.abort();
      clearInterval(interval);
    };
  }, [query, posts, pendingPosts]);

  function mergePendingPosts() {
    if (!pendingPosts.length) return;
    setPosts((prev) => dedupePosts([...pendingPosts, ...prev]));
    setPendingPosts([]);
  }

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
      {pendingPosts.length > 0 && (
        <button
          type="button"
          onClick={mergePendingPosts}
          className="sticky top-16 z-20 mx-auto block rounded-full border border-brand/40 bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
        >
          Novedades ({pendingPosts.length > 9 ? "+9" : pendingPosts.length})
        </button>
      )}
      {posts.map((post, index) => {
        const showBoundary =
          shouldShowExploringBoundary &&
          canInteract &&
          post.isFollowedAuthor === false &&
          (index === 0 || posts[index - 1]?.isFollowedAuthor !== false);

        return (
          <div key={post.id} className="space-y-4">
            {showBoundary && (
              <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide opacity-70">
                {strings.feed.exploringBoundary}
              </div>
            )}
            <PostCard post={post} canInteract={canInteract} />
          </div>
        );
      })}
      <div ref={sentinelRef} className="h-1" aria-hidden />
      {loadingMore && (
        <p className="px-4 py-2 text-center text-sm opacity-70">{strings.feed.loading}</p>
      )}
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

function getPostTimeMs(post: PostCardType) {
  const rawCreatedAt = post.created_at;
  if (!rawCreatedAt) return null;
  const createdAt = new Date(rawCreatedAt).getTime();
  return Number.isFinite(createdAt) ? createdAt : null;
}
