"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import Feed from "@/components/Feed";
import PostCard, { Post as PostCardType } from "@/components/PostCard";
import { useLocale } from "@/contexts/LocaleContext";

import UserRepliesList from "./UserRepliesList";
import SavedPostsFeed from "./SavedPostsFeed";

type TabId =
  | "posts"
  | "replies"
  | "highlights"
  | "articles"
  | "media"
  | "likes"
  | "bookmarks";

type TabDescriptor = {
  id: TabId;
  label: string;
  content: ReactNode;
};

export default function ProfileTabs({
  profileId,
  viewerId,
  showLikes,
  showBookmarks,
  pinnedPost,
}: {
  profileId: number;
  viewerId?: number | null;
  showLikes: boolean;
  showBookmarks: boolean;
  pinnedPost?: PostCardType | null;
}) {
  const { strings } = useLocale();
  const t = strings.profilePage;
  const canInteract = Boolean(viewerId);
  const isOwner = viewerId === profileId;
  const [active, setActive] = useState<TabId>("posts");

  const tabs = useMemo<TabDescriptor[]>(() => {
    const list: TabDescriptor[] = [
      {
        id: "posts",
        label: t.tabs.posts,
        content: <Feed key="posts" canInteract={canInteract} source={`user:${profileId}`} />,
      },
      {
        id: "replies",
        label: t.tabs.replies,
        content: <UserRepliesList key={`replies-${profileId}`} userId={profileId} />,
      },
      {
        id: "highlights",
        label: t.tabs.highlights,
        content: pinnedPost ? (
          <PostCard key={`pin-${pinnedPost.id}`} post={pinnedPost} canInteract={canInteract} pinned />
        ) : (
          <p className="text-sm opacity-70">{t.empty.highlights}</p>
        ),
      },
      {
        id: "articles",
        label: t.tabs.articles,
        content: <p className="text-sm opacity-70">{t.empty.articles}</p>,
      },
      {
        id: "media",
        label: t.tabs.media,
        content: <Feed key="media" canInteract={canInteract} source={`user:${profileId}`} filter="media" />,
      },
    ];

    if (showLikes) {
      list.push({
        id: "likes",
        label: t.tabs.likes,
        content: <Feed key="likes" canInteract={canInteract} source={`likes:${profileId}`} />,
      });
    }

    if (isOwner || showBookmarks) {
      list.push({
        id: "bookmarks",
        label: t.tabs.bookmarks,
        content: isOwner ? (
          <SavedPostsFeed canInteract={canInteract} />
        ) : (
          <p className="text-sm opacity-70">{t.empty.bookmarks}</p>
        ),
      });
    }

    return list;
  }, [t, canInteract, profileId, showLikes, showBookmarks, pinnedPost, isOwner]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    if (hash && tabs.some((tab) => tab.id === hash)) {
      setActive(hash);
    }
  }, [tabs]);

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace("#", "") as TabId;
      if (hash && tabs.some((tab) => tab.id === hash)) {
        setActive(hash);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [tabs]);

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  function selectTab(id: TabId) {
    setActive(id);
    const { pathname, search } = window.location;
    const base = `${pathname}${search}`;
    window.history.replaceState(null, "", id === "posts" ? base : `${base}#${id}`);
  }

  if (!current) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="sticky top-14 z-40 border-b border-border bg-surface px-4 sm:px-6">
        <ul className="flex h-12 items-center gap-4 text-sm">
          {tabs.map((tab) => {
            const isActive = tab.id === current.id;
            return (
              <li key={tab.id}>
                <button
                  id={`profile-tab-${tab.id}`}
                  type="button"
                  className={`relative px-1 pb-2 font-medium transition ${
                    isActive ? "text-foreground" : "opacity-60 hover:opacity-100"
                  }`}
                  onClick={() => selectTab(tab.id)}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 sm:p-6" id={current.id}>
        {current.content}
      </div>
    </div>
  );
}
