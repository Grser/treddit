import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: { username: string } }) {
  const me = await getSessionUser();

  const [rows] = await db.query(
    `SELECT id, username, nickname, avatar_url, banner_url, description, location, website,
            show_likes, show_bookmarks, created_at
     FROM Users WHERE username=? AND visible=1 LIMIT 1`, [params.username]);
  const user = (rows as any[])[0];
  if (!user) return <div className="p-6">Usuario no encontrado</div>;

  // Contadores rápidos
  const [[{ posts }]]: any = await db.query("SELECT COUNT(*) AS posts FROM Posts WHERE user=?", [user.id]);
  const [[{ following }]]: any = await db.query("SELECT COUNT(*) AS following FROM Follows WHERE follower=?", [user.id]);
  const [[{ followers }]]: any = await db.query("SELECT COUNT(*) AS followers FROM Follows WHERE followed=?", [user.id]);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <ProfileHeader
        viewerId={me?.id}
        user={user}
        stats={{ posts, followers, following }}
      />
      <ProfileTabs
        profileId={user.id}
        viewerId={me?.id}
        showLikes={!!user.show_likes}
        showBookmarks={!!user.show_bookmarks}
      />
    </div>
  );
}
