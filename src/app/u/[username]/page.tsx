import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";
import Navbar from "@/components/Navbar";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { getSessionUser } from "@/lib/auth";
import type { Post as PostCardType } from "@/components/PostCard";
import { canSendDirectMessage } from "@/lib/messages";
import { getDemoFeed, resolveDemoUserByUsername } from "@/lib/demoStore";

export const dynamic = "force-dynamic";

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  show_likes: number;
  show_bookmarks: number;
  created_at: Date | string;
  is_admin: number;
  is_verified: number;
  pinned_post_id: number | null;
};

type CountRow = RowDataPacket & { posts?: number; followers?: number; following?: number };
type FollowStatusRow = RowDataPacket & { isFollowing: number };

type PinnedPostRow = RowDataPacket & {
  id: number;
  user: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
  description: string | null;
  created_at: Date | string;
  reply_scope: number | null;
  mediaUrl: string | null;
  likes: number;
  comments: number;
  reposts: number;
  likedByMe: number;
  repostedByMe: number;
  hasPoll: number;
  community_id: number | null;
  community_slug: string | null;
  community_name: string | null;
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const me = await getSessionUser();

  if (!isDatabaseConfigured()) {
    const demoUser = resolveDemoUserByUsername(username);
    if (!demoUser) {
      return <div className="p-6">Usuario no encontrado</div>;
    }

    const feed = getDemoFeed({ limit: 20, username: demoUser.username });
    const pinnedPost = feed.items[0] ?? null;
    const followers = 120;
    const following = 48;

    return (
      <div className="min-h-dvh">
        <Navbar />
        <ProfileHeader
          viewerId={me?.id}
          user={{
            id: demoUser.id,
            username: demoUser.username,
            nickname: demoUser.nickname,
            avatar_url: demoUser.avatar_url,
            banner_url: "/demo-x.png",
            description: "Perfil de demostración sin base de datos.",
            location: "Internet",
            website: "https://treddit.app",
            created_at: new Date().toISOString(),
            is_admin: demoUser.is_admin,
            is_verified: demoUser.is_verified,
          }}
          stats={{ posts: feed.items.length, followers, following }}
          initiallyFollowing={false}
          canMessage={false}
          messageHref={null}
        />
        <ProfileTabs
          profileId={demoUser.id}
          viewerId={me?.id}
          showLikes={false}
          showBookmarks={false}
          pinnedPost={pinnedPost}
        />
      </div>
    );
  }

  const [rows] = await db.query<UserRow[]>(
    `SELECT id, username, nickname, avatar_url, banner_url, description, location, website,
            show_likes, show_bookmarks, created_at, is_admin, is_verified, pinned_post_id
     FROM Users WHERE username=? AND visible=1 LIMIT 1`,
    [username]
  );
  const userRow = rows[0];
  if (!userRow) return <div className="p-6">Usuario no encontrado</div>;

  const user = {
    id: Number(userRow.id),
    username: String(userRow.username),
    nickname: userRow.nickname ? String(userRow.nickname) : null,
    avatar_url: userRow.avatar_url ? String(userRow.avatar_url) : null,
    banner_url: userRow.banner_url ? String(userRow.banner_url) : null,
    description: userRow.description ? String(userRow.description) : null,
    location: userRow.location ? String(userRow.location) : null,
    website: userRow.website ? String(userRow.website) : null,
    show_likes: Boolean(userRow.show_likes),
    show_bookmarks: Boolean(userRow.show_bookmarks),
    created_at: new Date(userRow.created_at).toISOString(),
    is_admin: Boolean(userRow.is_admin),
    is_verified: Boolean(userRow.is_verified),
    pinned_post_id: userRow.pinned_post_id ? Number(userRow.pinned_post_id) : null,
  };

  // Contadores rápidos
  const [postCountRows] = await db.query<CountRow[]>("SELECT COUNT(*) AS posts FROM Posts WHERE user=?", [user.id]);
  const posts = Number(postCountRows[0]?.posts ?? 0);
  const [followingRows] = await db.query<CountRow[]>(
    "SELECT COUNT(*) AS following FROM Follows WHERE follower=?",
    [user.id],
  );
  const following = Number(followingRows[0]?.following ?? 0);
  const [followerRows] = await db.query<CountRow[]>(
    "SELECT COUNT(*) AS followers FROM Follows WHERE followed=?",
    [user.id],
  );
  const followers = Number(followerRows[0]?.followers ?? 0);

  let isFollowing = false;
  if (me) {
    const [followStatusRows] = await db.query<FollowStatusRow[]>(
      "SELECT EXISTS(SELECT 1 FROM Follows WHERE follower=? AND followed=?) AS isFollowing",
      [me.id, user.id],
    );
    isFollowing = Boolean(followStatusRows[0]?.isFollowing);
  }

  let canMessage = false;
  let messageHref: string | null = null;
  if (me && me.id !== user.id) {
    canMessage = await canSendDirectMessage(me.id, user.id);
    if (canMessage) {
      messageHref = `/mensajes/${user.username}`;
    }
  }

  let pinnedPost: PostCardType | null = null;
  if (user.pinned_post_id) {
    const [pinnedRows] = await db.query<PinnedPostRow[]>(
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
        ) END AS repostedByMe,
        p.community_id,
        c.slug AS community_slug,
        c.name AS community_name
      FROM Posts p
      JOIN Users u ON u.id = p.user
      LEFT JOIN Communities c ON c.id = p.community_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [me?.id ?? null, me?.id ?? null, me?.id ?? null, me?.id ?? null, user.pinned_post_id]
    );

    const row = pinnedRows[0];
    if (row) {
      pinnedPost = {
        id: Number(row.id),
        user: Number(row.user),
        username: String(row.username),
        nickname: row.nickname ? String(row.nickname) : null,
        avatar_url: row.avatar_url ? String(row.avatar_url) : null,
        is_admin: Boolean(row.is_admin),
        is_verified: Boolean(row.is_verified),
        description: row.description ? String(row.description) : null,
        created_at: new Date(row.created_at).toISOString(),
        reply_scope: Number(row.reply_scope ?? 0),
        mediaUrl: row.mediaUrl ? String(row.mediaUrl) : null,
        likes: Number(row.likes) || 0,
        comments: Number(row.comments) || 0,
        reposts: Number(row.reposts) || 0,
        likedByMe: Boolean(row.likedByMe),
        repostedByMe: Boolean(row.repostedByMe),
        hasPoll: Boolean(row.hasPoll),
        isOwner: me?.id ? Number(row.user) === me.id : false,
        isAdminViewer: Boolean(me?.is_admin),
        community:
          row.community_id && row.community_slug
            ? {
                id: Number(row.community_id),
                slug: String(row.community_slug),
                name: row.community_name ? String(row.community_name) : String(row.community_slug),
              }
            : null,
      } satisfies PostCardType;
    }
  }

  return (
    <div className="min-h-dvh">
      <Navbar />
      <ProfileHeader
        viewerId={me?.id}
        user={{
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          banner_url: user.banner_url,
          description: user.description,
          location: user.location,
          website: user.website,
          created_at: user.created_at,
          is_admin: user.is_admin,
          is_verified: user.is_verified,
        }}
        stats={{ posts, followers, following }}
        initiallyFollowing={isFollowing}
        canMessage={canMessage}
        messageHref={messageHref}
      />
      <ProfileTabs
        profileId={user.id}
        viewerId={me?.id}
        showLikes={Boolean(user.show_likes)}
        showBookmarks={Boolean(user.show_bookmarks)}
        pinnedPost={pinnedPost}
      />
    </div>
  );
}
