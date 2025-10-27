// src/app/p/[id]/edit/page.tsx
import Navbar from "@/components/Navbar";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const me = await requireUser();
  const id = Number(params.id);

  const [rows] = await db.query(
    "SELECT p.id, p.user, p.description, p.reply_scope FROM Posts p WHERE p.id=? LIMIT 1",
    [id]
  );
  const post = (rows as any[])[0];
  if (!post) return <div className="p-6">Post no encontrado</div>;

  const [r] = await db.query("SELECT is_admin FROM Users WHERE id=?", [me.id]);
  const isAdmin = !!(r as any[])[0]?.is_admin;
  if (post.user !== me.id && !isAdmin) return <div className="p-6">No autorizado</div>;

  return (
    <div className="min-h-dvh">
      <Navbar />
      <form className="max-w-2xl mx-auto p-4 space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget as HTMLFormElement);
        const body = {
          description: String(form.get("description") || ""),
          reply_scope: Number(form.get("reply_scope") || 0),
        };
        const res = await fetch(`/api/posts/${id}`, {
          method: "PATCH", headers: {"Content-Type":"application/json"},
          body: JSON.stringify(body),
        });
        if (res.ok) location.href = `/p/${id}`;
        else alert("No se pudo actualizar");
      }}>
        <label className="block">
          <span className="text-sm">Contenido</span>
          <textarea name="description" defaultValue={post.description || ""} rows={6}
            className="w-full bg-input rounded-md p-3 ring-1 ring-border outline-none" />
        </label>

        <label className="block">
          <span className="text-sm">Quién puede responder</span>
          <select name="reply_scope" defaultValue={post.reply_scope} className="h-10 px-3 rounded-md bg-input ring-1 ring-border">
            <option value={0}>Todos</option>
            <option value={1}>Personas que sigues</option>
            <option value={2}>Solo mencionados</option>
          </select>
        </label>

        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-brand text-white">Guardar</button>
          <a href={`/p/${id}`} className="h-10 px-4 rounded-full border border-border">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
