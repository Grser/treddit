import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";

export default async function AdminPosts() {
  await requireAdmin();
  const [rows] = await db.query(
    `SELECT p.id, u.username, u.nickname, p.description, p.created_at
     FROM Posts p JOIN Users u ON u.id=p.user ORDER BY p.created_at DESC LIMIT 200`
  );
  const posts = rows as any[];

  return (
    <div>
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Posts</h2>
        <ul className="space-y-3">
          {posts.map(p => (
            <li key={p.id} className="border border-border rounded p-3">
              <p className="text-sm mb-1"><b>@{p.username}</b> · {new Date(p.created_at).toLocaleString()}</p>
              <p className="text-sm mb-2">{p.description}</p>
              <form action={`/api/posts/${p.id}`} method="post" className="inline">
                <input type="hidden" name="_method" value="DELETE" />
                <button formAction={`/api/posts/${p.id}`} className="underline">Eliminar</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
