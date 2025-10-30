import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPosts() {
  await requireAdmin();
  const [rows] = await db.query(
    `SELECT p.id, u.username, u.nickname, u.is_admin, u.is_verified, p.description, p.created_at
     FROM Posts p JOIN Users u ON u.id=p.user ORDER BY p.created_at DESC LIMIT 200`
  );
  const posts = rows as any[];

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <h2 className="mb-4 text-xl font-semibold">Posts</h2>
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded border border-border p-3">
              <p className="mb-1 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold">
                  @{p.username}
                  <UserBadges size="sm" isAdmin={p.is_admin} isVerified={p.is_verified} />
                </span>
                <span className="opacity-60"> · {new Date(p.created_at).toLocaleString()}</span>
              </p>
              <p className="mb-2 text-sm">{p.description}</p>
              <form action={`/api/posts/${p.id}`} method="post" className="inline">
                <input type="hidden" name="_method" value="DELETE" />
                <button formAction={`/api/posts/${p.id}`} className="underline">
                  Eliminar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
