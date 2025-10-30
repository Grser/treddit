import Navbar from "@/components/Navbar";
import AdminDashboard, { type AdminStats } from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminHome() {
  await requireAdmin();

  const [[{ totalUsers }]] = await db.query("SELECT COUNT(*) AS total FROM Users WHERE visible=1");
  const [[{ totalPosts }]] = await db.query("SELECT COUNT(*) AS total FROM Posts");
  const [[{ totalCommunities }]] = await db.query("SELECT COUNT(*) AS total FROM Communities WHERE visible=1");
  const [[{ totalModerators }]] = await db.query(
    "SELECT COUNT(DISTINCT user_id) AS total FROM Community_Members WHERE role <> 'member'",
  );

  const stats: AdminStats = {
    users: Number(totalUsers) || 0,
    posts: Number(totalPosts) || 0,
    communities: Number(totalCommunities) || 0,
    moderators: Number(totalModerators) || 0,
  };

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <AdminDashboard stats={stats} />
      </div>
    </div>
  );
}
