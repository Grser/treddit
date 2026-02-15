import type { RowDataPacket } from "mysql2";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureUsersAgeColumns, ensureAgeVerificationRequestsTable } from "@/lib/ageVerification";
import { getAllowMessagesFromAnyone } from "@/lib/messages";
import { COUNTRY_OPTIONS } from "@/lib/countries";
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
  birth_date: Date | string | null;
  country_of_origin: string | null;
  is_age_verified: number;
  has_age_request: number;
  id_document_url: string | null;
};

function toDateInputValue(raw: Date | string | null | undefined) {
  if (!raw) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const text = String(raw).trim();
  const latamMatch = text.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (latamMatch) {
    const [, day, month, year] = latamMatch;
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

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

  const birthDateValue = toDateInputValue(u.birth_date);
  const selectedCountry = (u.country_of_origin || "").trim();
  const hasSelectedCountry = selectedCountry && COUNTRY_OPTIONS.some((country) => country.name === selectedCountry);
  const ageStatus = u.is_age_verified ? "Verificada" : u.has_age_request ? "Solicitud enviada" : "Sin verificar";

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Editar perfil</h1>
          <p className="mt-2 text-sm opacity-70">Actualiza tu información pública y preferencias de privacidad.</p>
        </header>

        <form action="/api/profile" method="post" className="space-y-5">
          <input type="hidden" name="mode" value="update" />

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Información básica</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm">Nombre</span>
                <input name="nickname" defaultValue={u.nickname || ""} className="mt-1 h-10 w-full rounded-xl bg-input px-3 ring-1 ring-border outline-none focus:ring-2" />
              </label>
              <label className="block">
                <span className="text-sm">Biografía</span>
                <textarea name="description" defaultValue={u.description || ""} className="mt-1 w-full rounded-xl bg-input p-3 ring-1 ring-border outline-none focus:ring-2" rows={4} />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Imágenes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePickerField name="avatar_url" label="Avatar" initialUrl={u.avatar_url} />
              <ImagePickerField name="banner_url" label="Banner" initialUrl={u.banner_url} />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Datos personales</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm">Ubicación</span>
                <input name="location" defaultValue={u.location || ""} className="mt-1 h-10 w-full rounded-xl bg-input px-3 ring-1 ring-border outline-none focus:ring-2" />
              </label>
              <label className="block">
                <span className="text-sm">Sitio web</span>
                <input name="website" defaultValue={u.website || ""} className="mt-1 h-10 w-full rounded-xl bg-input px-3 ring-1 ring-border outline-none focus:ring-2" />
              </label>
              <label className="block">
                <span className="text-sm">Fecha de nacimiento</span>
                <input name="birth_date" type="date" defaultValue={birthDateValue} className="mt-1 h-10 w-full rounded-xl bg-input px-3 ring-1 ring-border outline-none focus:ring-2" />
              </label>
              <label className="block">
                <span className="text-sm">País de origen</span>
                <select name="country_of_origin" defaultValue={selectedCountry} className="mt-1 h-10 w-full rounded-xl bg-input px-3 ring-1 ring-border outline-none focus:ring-2">
                  <option value="">Selecciona un país</option>
                  {!hasSelectedCountry && selectedCountry ? <option value={selectedCountry}>{selectedCountry}</option> : null}
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.name}>{country.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Verificación de edad</h2>
            <p className="text-sm opacity-75">Estado actual: <span className="font-semibold">{ageStatus}</span></p>
            {!u.is_age_verified ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_18rem]">
                <ImagePickerField
                  name="id_document_url"
                  label="Foto de DNI/Carnet/Pasaporte"
                  initialUrl={u.id_document_url}
                />
                <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm">
                  <p className="font-semibold">Solicitar verificación</p>
                  <p className="mt-1 text-xs opacity-75">Sube tu documento y activa la solicitud para revisión de administración.</p>
                  <label className="mt-3 inline-flex items-center gap-2">
                    <input type="checkbox" name="request_age_verification" defaultChecked={Boolean(u.has_age_request)} />
                    Enviar solicitud
                  </label>
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                Tu edad ya está verificada. No necesitas enviar más solicitudes.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Privacidad</h2>
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
          </section>

          <div className="flex gap-3">
            <button className="h-10 rounded-full bg-brand px-5 text-white">Guardar cambios</button>
            <a href={`/u/${me.username}`} className="h-10 rounded-full border border-border px-5 leading-10">Cancelar</a>
          </div>
        </form>
      </main>
    </div>
  );
}
