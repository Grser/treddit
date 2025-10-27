"use client";
import CommentsThread from "./CommentsThread";
import PostActions from "./PostActions";
import PostPoll from "./PostPoll";
import PostMenu from "./PostMenu";

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

  // extras para rotulado
  replyTo?: { username: string; postId: number } | null;
  isOwner?: boolean;
  isAdminViewer?: boolean;
};

export default function PostCard({
  post,
  canInteract,
}: {
  post: Post;
  canInteract: boolean;
}) {
  const avatar = post.avatar_url?.trim() ? post.avatar_url! : "/demo-reddit.png";

  return (
    <article className="bg-surface text-foreground rounded-xl border border-border p-4">
      {/* Banda superior: Reposteaste */}
      {post.repostedByMe && (
        <div className="text-emerald-400 text-sm font-semibold -mt-2 mb-1 flex items-center gap-2">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4M7 23l-4-4 4-4" />
            <path d="M21 5H10a4 4 0 0 0-4 4v2M3 19h11a4 4 0 0 0 4-4v-2" />
          </svg>
          Reposteaste
        </div>
      )}

      {/* Cabecera */}
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
              <p className="text-sm font-semibold truncate">
                <a href={`/u/${post.username}`} className="hover:underline">
                  {post.nickname}
                </a>{" "}
                <span className="opacity-60">@{post.username}</span>
              </p>
              <p className="text-xs opacity-60">
                <a href={`/p/${post.id}`} className="hover:underline">
                  {new Date(post.created_at).toLocaleString()}
                </a>
              </p>
            </div>

            {/* menú de 3 puntos */}
            <PostMenu
              postId={post.id}
              isOwner={!!post.isOwner}
              isAdmin={!!post.isAdminViewer}
              pinned={false}
              replyScope={post.reply_scope as any}
            />
          </div>

          {/* En respuesta a … (si viene del feed) */}
          {post.replyTo && (
            <p className="text-sm mt-1 opacity-70">
              En respuesta a{" "}
              <a className="text-blue-400 hover:underline" href={`/u/${post.replyTo.username}`}>
                @{post.replyTo.username}
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Texto */}
      {post.description && (
        <p className="text-sm mb-2 whitespace-pre-wrap break-words">{post.description}</p>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <div className="overflow-hidden rounded-lg mb-2 ring-1 ring-border">
          {/* Para vídeo, detecta extensión y usa <video controls> */}
          <img src={post.mediaUrl} alt="" className="w-full" />
        </div>
      )}

      {/* Encuesta */}
      {post.hasPoll && <PostPoll postId={post.id} canInteract={canInteract} />}

      {/* Acciones */}
      <PostActions
        postId={post.id}
        canInteract={canInteract}
        initial={{
          likes: post.likes,
          liked: post.likedByMe,
          comments: post.comments,
          reposts: post.reposts ?? 0,
          reposted: post.repostedByMe,
          views: post.views ?? 0,
        }}
      />

      {/* Comentarios en hilo */}
      <div id={`comments-${post.id}`} className="mt-2">
        <CommentsThread postId={post.id} canInteract={canInteract} />
      </div>
    </article>
  );
}
