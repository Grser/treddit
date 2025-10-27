import { requireAdmin } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export default async function AdminHome() {
  await requireAdmin();
  return (
    <div>
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Panel de administración</h1>
        <ul className="list-disc pl-6">
          <li><a className="hover:underline" href="/admin/users">Usuarios</a></li>
          <li><a className="hover:underline" href="/admin/posts">Posts</a></li>
        </ul>
      </div>
    </div>
  );
}
