import type { RowDataPacket } from "mysql2";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureUsersAgeColumns, ensureAgeVerificationRequestsTable } from "@/lib/ageVerification";
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
  birth_date: string | null;
  country_of_origin: string | null;
  is_age_verified: number;
  has_age_request: number;
  id_document_url: string | null;
};

export default async function EditProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const me = await requireUser();
  if (!me || me.username !== username) return <div className="p-6">No autorizado</div>;

  await Promise.all([ensureUsersAgeColumns(), ensureAgeVerificationRequestsTable()]);

  const [[rows], allowMessages] = await Promise.all([
    db.query<ProfileRow[]>(
      `SELECT u.nickname, u.avatar_url, u.banner_url, u.description, u.location, u.website,
              u.show_likes, u.show_bookmarks, u.birth_date, u.is_age_verified,
              u.country_of_origin,
              EXISTS(SELECT 1 FROM Age_Verification_Requests avr WHERE avr.user_id = u.id) AS has_age_request
              ,(SELECT avr.id_document_url FROM Age_Verification_Requests avr WHERE avr.user_id = u.id LIMIT 1) AS id_document_url
       FROM Users u
       WHERE u.id=?
       LIMIT 1`,
      [me.id],
    ),
    getAllowMessagesFromAnyone(me.id),
  ]);
  const u = rows[0] ?? {
    nickname: "",
    avatar_url: null,
    banner_url: null,
    description: "",
    location: "",
    website: "",
    show_likes: 0,
    show_bookmarks: 0,
    birth_date: null,
    is_age_verified: 0,
    has_age_request: 0,
    country_of_origin: "",
    id_document_url: null,
  };

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
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm">Fecha de nacimiento</span>
            <input name="birth_date" type="date" defaultValue={u.birth_date ? String(u.birth_date).slice(0, 10) : ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" />
          </label>
          <label className="block">
            <span className="text-sm">País de origen</span>
            <input name="country_of_origin" defaultValue={u.country_of_origin || ""} className="w-full bg-input rounded-md h-10 px-3 ring-1 ring-border outline-none" placeholder="Ej. México" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <ImagePickerField
            name="id_document_url"
            label="Foto de DNI/Carnet/Pasaporte"
            initialUrl={u.id_document_url}
          />
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <p className="font-semibold">Verificación de edad</p>
            <p className="mt-1 opacity-75">Estado: {u.is_age_verified ? "Verificada" : u.has_age_request ? "Solicitud enviada" : "Sin verificar"}</p>
            <p className="mt-1 opacity-75">Para solicitarla debes subir foto de tu documento y país de origen.</p>
            <label className="mt-2 inline-flex items-center gap-2">
              <input type="checkbox" name="request_age_verification" defaultChecked={Boolean(u.has_age_request)} disabled={Boolean(u.is_age_verified)} />
              Enviar solicitud al panel de admin
            </label>
          </div>
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
