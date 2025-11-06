import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { getSessionUser } from "@/lib/auth";
import type { Post as PostCardType } from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: { username: string } }) {
  const me = await getSessionUser();

  const [rows] = await db.query(
    `SELECT id, username, nickname, avatar_url, banner_url, description, location, website,
            show_likes, show_bookmarks, created_at, is_admin, is_verified, pinned_post_id
     FROM Users WHERE username=? AND visible=1 LIMIT 1`,
    [params.username]
  );
  const user = (rows as any[])[0];
  if (!user) return <div className="p-6">Usuario no encontrado</div>;

  // Contadores rápidos
  const [[{ posts }]]: any = await db.query("SELECT COUNT(*) AS posts FROM Posts WHERE user=?", [user.id]);
  const [[{ following }]]: any = await db.query("SELECT COUNT(*) AS following FROM Follows WHERE follower=?", [user.id]);
  const [[{ followers }]]: any = await db.query("SELECT COUNT(*) AS followers FROM Follows WHERE followed=?", [user.id]);

  let isFollowing = false;
  if (me) {
    const [[{ isFollowing: followingValue }]]: any = await db.query(
      "SELECT EXISTS(SELECT 1 FROM Follows WHERE follower=? AND followed=?) AS isFollowing",
      [me.id, user.id],
    );
    isFollowing = Boolean(followingValue);
  }

  let pinnedPost: PostCardType | null = null;
  if (user.pinned_post_id) {
    const [pinnedRows] = await db.query(
      `
      SELECT
        p.id,
        p.user,
        u.username,
        u.nickname,
        u.avatar_url,
        u.is_admin,
        u.is_verified,
        p.description,
        p.created_at,
        p.reply_scope,
        (SELECT f.route FROM Files f WHERE f.postid=p.id ORDER BY f.id ASC LIMIT 1) AS mediaUrl,
        (SELECT COUNT(*) FROM Like_Posts lp WHERE lp.post=p.id) AS likes,
        (SELECT COUNT(*) FROM Comments  c  WHERE c.post=p.id) AS comments,
        (SELECT COUNT(*) FROM Reposts   r  WHERE r.post_id=p.id) AS reposts,
        EXISTS(SELECT 1 FROM Polls pl WHERE pl.post_id=p.id)     AS hasPoll,
        CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
          SELECT 1 FROM Like_Posts x WHERE x.post=p.id AND x.user=?
        ) END AS likedByMe,
        CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
          SELECT 1 FROM Reposts y WHERE y.post_id=p.id AND y.user_id=?
        ) END AS repostedByMe
      FROM Posts p
      JOIN Users u ON u.id = p.user
      WHERE p.id = ?
      LIMIT 1
      `,
      [me?.id ?? null, me?.id ?? null, me?.id ?? null, me?.id ?? null, user.pinned_post_id]
    );

    const row = (pinnedRows as any[])[0];
    if (row) {
      pinnedPost = {
        id: row.id,
        user: row.user,
        username: row.username,
        nickname: row.nickname,
        avatar_url: row.avatar_url,
        is_admin: row.is_admin,
        is_verified: row.is_verified,
        description: row.description,
        created_at: new Date(row.created_at).toISOString(),
        reply_scope: Number(row.reply_scope ?? 0),
        mediaUrl: row.mediaUrl,
        likes: Number(row.likes) || 0,
        comments: Number(row.comments) || 0,
        reposts: Number(row.reposts) || 0,
        likedByMe: Boolean(row.likedByMe),
        repostedByMe: Boolean(row.repostedByMe),
        hasPoll: Boolean(row.hasPoll),
        isOwner: me?.id ? Number(row.user) === me.id : false,
        isAdminViewer: Boolean(me?.is_admin),
      } satisfies PostCardType;
    }
  }

  return (
    <div className="min-h-dvh">
      <Navbar />
      <ProfileHeader
        viewerId={me?.id}
        user={user}
        stats={{ posts, followers, following }}
        initiallyFollowing={isFollowing}
      />
      <ProfileTabs
        profileId={user.id}
        viewerId={me?.id}
        showLikes={!!user.show_likes}
        showBookmarks={!!user.show_bookmarks}
        pinnedPost={pinnedPost}
      />
    </div>
  );
}
