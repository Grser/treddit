import type { RowDataPacket } from "mysql2";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllowMessagesFromAnyone } from "@/lib/messages";
import Navbar from "@/components/Navbar";
import ImagePickerField from "@/components/profile/ImagePickerField";

type ProfileRow = RowDataPacket & {
  nickname: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  show_likes: number;
  show_bookmarks: number;
};

export default async function EditProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const me = await requireUser();
  if (!me || me.username !== username) return <div className="p-6">No autorizado</div>;

  const [rows] = await db.query<ProfileRow[]>(
    "SELECT nickname, avatar_url, banner_url, description, location, website, show_likes, show_bookmarks FROM Users WHERE id=? LIMIT 1",
    [me.id]
  );
  const u = rows[0] ?? {
    nickname: "",
    avatar_url: null,
    banner_url: null,
    description: "",
    location: "",
    website: "",
    show_likes: 0,
    show_bookmarks: 0,
  };
  const allowMessages = await getAllowMessagesFromAnyone(me.id);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <form
        action="/api/profile"
        method="post"
        className="max-w-2xl mx-auto p-4 space-y-4"
      >
        <input type="hidden" name="mode" value="update" />
        <label className="block">
          <span className="text-sm">Nombre</span>
          <input name="nickname" defaultValue={u.nickname || ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
        </label>
        <label className="block">
          <span className="text-sm">Biografía</span>
          <textarea name="description" defaultValue={u.description || ""} className="w-full bg-input rounded-md p-3 ring-1 ring-border outline-none" rows={4} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImagePickerField
            name="avatar_url"
            label="Avatar"
            initialUrl={u.avatar_url}
          />
          <ImagePickerField
            name="banner_url"
            label="Banner"
            initialUrl={u.banner_url}
          />
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
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="show_likes" defaultChecked={!!u.show_likes} />
            Mostrar Me gusta
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="show_bookmarks" defaultChecked={!!u.show_bookmarks} />
            Mostrar Guardados
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="allow_messages_anyone" defaultChecked={allowMessages} />
            Aceptar mensajes de terceros
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
