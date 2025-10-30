import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";

export default async function EditProfilePage({ params }: { params: { username: string } }) {
  const me = await requireUser();
  if (!me || me.username !== params.username) return <div className="p-6">No autorizado</div>;

  const [rows] = await db.query(
    "SELECT nickname, avatar_url, banner_url, description, location, website, show_likes, show_bookmarks FROM Users WHERE id=? LIMIT 1",
    [me.id]
  );
  const u = (rows as any[])[0];

  return (
    <div className="min-h-dvh">
      <Navbar />
      <form action="/api/profile" method="post" className="max-w-2xl mx-auto p-4 space-y-4">
        <input type="hidden" name="mode" value="update" />
        <label className="block">
          <span className="text-sm">Nombre</span>
          <input name="nickname" defaultValue={u.nickname} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
        </label>
        <label className="block">
          <span className="text-sm">Biografía</span>
          <textarea name="description" defaultValue={u.description || ""} className="w-full bg-input rounded-md p-3 ring-1 ring-border outline-none" rows={4} />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm">Avatar URL</span>
            <input name="avatar_url" defaultValue={u.avatar_url || ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
          </label>
          <label className="block">
            <span className="text-sm">Banner URL</span>
            <input name="banner_url" defaultValue={u.banner_url || ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm">Ubicación</span>
            <input name="location" defaultValue={u.location || ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
          </label>
          <label className="block">
            <span className="text-sm">Sitio web</span>
            <input name="website" defaultValue={u.website || ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
          </label>
        </div>
        <div className="flex gap-6 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="show_likes" defaultChecked={!!u.show_likes} />
            Mostrar Me gusta
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="show_bookmarks" defaultChecked={!!u.show_bookmarks} />
            Mostrar Guardados
          </label>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-brand text-white">Guardar</button>
          <a href={`/u/${me.username}`} className="h-10 px-4 rounded-full border border-border">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
