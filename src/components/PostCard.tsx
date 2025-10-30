"use client";
import CommentsThread from "./CommentsThread";
import PostActions from "./PostActions";
import PostPoll from "./PostPoll";
import PostMenu from "./PostMenu";
import UserBadges from "./UserBadges";

import { useLocale } from "@/contexts/LocaleContext";

export type Post = {
  id: number;
  user: number;
  username: string;
  nickname: string;
  avatar_url?: string | null;
  description?: string | null;
  mediaUrl?: string | null;
  created_at: string;
  likes: number;
  comments: number;
  reposts?: number;
  likedByMe?: boolean;
  repostedByMe?: boolean;
  views?: number;
  hasPoll?: boolean;
  reply_scope?: 0 | 1 | 2;
  replyTo?: { username: string; postId: number } | null;
  isOwner?: boolean;
  isAdminViewer?: boolean;
  is_admin?: boolean;
  is_verified?: boolean;
};

export default function PostCard({
  post,
  canInteract,
}: {
  post: Post;
  canInteract: boolean;
}) {
  const { strings } = useLocale();
  const avatar = post.avatar_url?.trim() || "/demo-reddit.png";
  const repostedByMe = Boolean(post.repostedByMe);
  const displayName = post.nickname?.trim() || post.username;

  return (
    <article className="bg-surface text-foreground rounded-xl border border-border p-4">
      {repostedByMe && (
        <>
          {/* Banda superior: Reposteaste */}
          <div className="text-emerald-400 text-sm font-semibold -mt-2 mb-1 flex items-center gap-2">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4M7 23l-4-4 4-4" />
              <path d="M21 5H10a4 4 0 0 0-4 4v2M3 19h11a4 4 0 0 0 4-4v-2" />
            </svg>
            {strings.postCard.reposted}
          </div>
        </>
      )}

      <div className="flex items-start gap-3 mb-2">
        <a href={`/u/${post.username}`} title={`@${post.username}`} className="shrink-0">
          <img
            src={avatar}
            alt={post.nickname || post.username}
            className="size-9 rounded-full object-cover ring-1 ring-border"
          />
        </a>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="leading-tight flex-1 min-w-0">
              <p className="text-sm font-semibold truncate flex items-center gap-2">
                <a href={`/u/${post.username}`} className="hover:underline truncate">
                  {displayName}
                </a>
                <UserBadges
                  size="sm"
                  isAdmin={post.is_admin}
                  isVerified={post.is_verified}
                  labels={strings.badges}
                />
                <span className="opacity-60">@{post.username}</span>
              </p>
              <p className="text-xs opacity-60">
                <a href={`/p/${post.id}`} className="hover:underline">
                  {new Date(post.created_at).toLocaleString()}
                </a>
              </p>
            </div>

            <PostMenu
              postId={post.id}
              isOwner={!!post.isOwner}
              isAdmin={!!post.isAdminViewer}
              pinned={false}
              replyScope={post.reply_scope}
            />
          </div>

          {post.replyTo && (
            <p className="text-sm mt-1 opacity-70">
              {strings.postCard.replyingTo}{" "}
              <a className="text-blue-400 hover:underline" href={`/u/${post.replyTo.username}`}>
                @{post.replyTo.username}
              </a>
            </p>
          )}
        </div>
      </div>

      {post.description && <p className="text-sm mb-2 whitespace-pre-wrap break-words">{post.description}</p>}

      {post.mediaUrl && (
        <div className="overflow-hidden rounded-lg mb-2 ring-1 ring-border">
          <img src={post.mediaUrl} alt="" className="w-full" />
        </div>
      )}

      {post.hasPoll && <PostPoll postId={post.id} canInteract={canInteract} />}

      <PostActions
        postId={post.id}
        canInteract={canInteract}
        initial={{
          likes: post.likes,
          liked: post.likedByMe,
          comments: post.comments,
          reposts: post.reposts ?? 0,
          reposted: repostedByMe,
          views: post.views ?? 0,
        }}
      />

      <div id={`comments-${post.id}`} className="mt-2">
        <CommentsThread postId={post.id} canInteract={canInteract} />
      </div>
    </article>
  );
}
