"use client";
import Image from "next/image";
import Link from "next/link";
import CommentsThread from "./CommentsThread";
import PostActions from "./PostActions";
import PostPoll from "./PostPoll";
import PostMenu from "./PostMenu";
import UserBadges from "./UserBadges";
import MentionUserLink from "./MentionUserLink";

import { useLocale } from "@/contexts/LocaleContext";
import { useState } from "react";

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
  community?: { id: number; slug: string; name: string } | null;
  is_sensitive?: boolean;
  can_view_sensitive?: boolean;
};

export default function PostCard({
  post,
  canInteract,
  pinned = false,
}: {
  post: Post;
  canInteract: boolean;
  pinned?: boolean;
}) {
  const { locale, strings } = useLocale();
  const avatar = post.avatar_url?.trim() || "/demo-reddit.png";
  const repostedByMe = Boolean(post.repostedByMe);
  const displayName = post.nickname?.trim() || post.username;
  const pinnedLabel = strings.profilePage?.pinnedBadge || strings.postCard.pinned;
  const community = post.community;
  const canViewSensitive = Boolean(post.can_view_sensitive);
  const [showSensitive, setShowSensitive] = useState(!post.is_sensitive);
  const createdAtLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(post.created_at));
  const previewUrl = post.description ? extractFirstUrl(post.description) : null;

  return (
    <article className="bg-surface text-foreground rounded-xl border border-border p-4">
      {pinned && (
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-500">
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M14 2a1 1 0 0 0-.94.66L12.3 6H9a1 1 0 0 0-.78 1.63l2.16 2.52-3.65 9.13a.75.75 0 0 0 1.26.77l4.6-5.09 2.9 3.39a.75.75 0 0 0 1.31-.53v-6.15l2.64-1.69a1 1 0 0 0-.13-1.78L15 6.76V3a1 1 0 0 0-1-1Z" />
          </svg>
          <span>{pinnedLabel}</span>
        </div>
      )}
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
        <Link href={`/u/${post.username}`} title={`@${post.username}`} className="shrink-0">
          <Image
            src={avatar}
            alt={post.nickname || post.username}
            width={36}
            height={36}
            className="size-9 rounded-full object-cover ring-1 ring-border"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="leading-tight flex-1 min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-2">
                <MentionUserLink username={post.username} text={displayName} className="hover:underline truncate" />
                <UserBadges
                  size="sm"
                  isAdmin={post.is_admin}
                  isVerified={post.is_verified}
                  labels={strings.badges}
                />
                <MentionUserLink username={post.username} text={`@${post.username}`} className="hidden opacity-60 hover:underline sm:inline" />
              </div>
              <p className="text-xs opacity-60">
                <Link href={`/p/${post.id}`} className="hover:underline">
                  {createdAtLabel}
                </Link>
                {community && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <Link
                      href={`/c/${community.slug}`}
                      className="hover:underline"
                      title={community.name}
                    >
                      {community.name}
                    </Link>
                  </>
                )}
              </p>
            </div>

            <PostMenu
              postId={post.id}
              isOwner={!!post.isOwner}
              isAdmin={!!post.isAdminViewer}
              pinned={pinned}
              replyScope={post.reply_scope}
            />
          </div>

          {post.replyTo && (
            <div className="text-sm mt-1 opacity-70">
              {strings.postCard.replyingTo}{" "}
              <MentionUserLink
                username={post.replyTo.username}
                text={`@${post.replyTo.username}`}
                className="text-blue-400 hover:underline"
              />
            </div>
          )}
        </div>
      </div>

      {post.description && showSensitive && (
        <p className="text-sm mb-2 whitespace-pre-wrap break-words">{renderDescription(post.description)}</p>
      )}

      {previewUrl && showSensitive && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block rounded-lg border border-border bg-input/60 p-3 hover:bg-input"
        >
          <p className="text-xs uppercase tracking-wide opacity-60">Vista previa del enlace</p>
          <p className="mt-1 truncate text-sm font-medium">{getUrlHostname(previewUrl)}</p>
          <p className="truncate text-xs opacity-70">{previewUrl}</p>
        </a>
      )}

      {post.is_sensitive && !showSensitive && canViewSensitive && (
        <button
          type="button"
          onClick={() => setShowSensitive(true)}
          className="mb-2 w-full rounded-lg border border-border bg-muted/40 px-4 py-6 text-left"
        >
          <p className="text-sm font-semibold">Contenido sensible</p>
          <p className="mt-1 text-xs opacity-70">Este post puede incluir material delicado. Presiona para mostrarlo.</p>
        </button>
      )}

      {post.is_sensitive && !showSensitive && !canViewSensitive && (
        <div className="mb-2 w-full rounded-lg border border-border bg-muted/40 px-4 py-6 text-left">
          <p className="text-sm font-semibold">Contenido sensible bloqueado</p>
          <p className="mt-1 text-xs opacity-70">Debes verificar tu edad para poder mostrar este contenido.</p>
        </div>
      )}

      {post.mediaUrl && showSensitive && (
        <div className="mb-2 overflow-hidden rounded-lg ring-1 ring-border">
          {isAnimatedImage(post.mediaUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="" className="h-auto w-full object-cover" loading="lazy" />
          ) : (
            <Image
              src={post.mediaUrl}
              alt=""
              width={1200}
              height={675}
              sizes="(min-width: 768px) 600px, 100vw"
              className="h-auto w-full object-cover"
            />
          )}
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


function isAnimatedImage(url: string) {
  const normalized = url.toLowerCase();
  return normalized.includes(".gif") || normalized.includes("format=gif") || normalized.includes("type=sticker") || normalized.includes("type=gif");
}

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? sanitizeUrlToken(match[0]) : null;
}

function sanitizeUrlToken(value: string) {
  return value.replace(/[),.!?]+$/g, "");
}

function getUrlHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function renderDescription(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|[#@][\p{L}\p{N}_]+)/gu);
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      const normalized = sanitizeUrlToken(part);
      return (
        <a
          key={`url-${index}-${normalized}`}
          href={normalized}
          target="_blank"
          rel="noreferrer"
          className="text-sky-400 hover:underline"
        >
          {normalized}
        </a>
      );
    }

    if (/^#[\p{L}\p{N}_]+$/u.test(part)) {
      const href = `/buscar?q=${encodeURIComponent(part)}`;
      return (
        <a
          key={`tag-${index}-${part}`}
          href={href}
          className="text-brand font-semibold hover:underline"
        >
          {part}
        </a>
      );
    }

    if (/^@[\p{L}\p{N}_]+$/u.test(part)) {
      const username = part.slice(1);
      return (
        <MentionUserLink key={`mention-${index}-${part}`} username={username} text={part} />
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
}
