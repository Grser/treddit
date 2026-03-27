import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import CommunityEditPanel from "@/components/community/CommunityEditPanel";
import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getCommunityAccessControl } from "@/lib/communityPermissions";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type CommunityRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
};

export default async function EditCommunityPage({ params }: PageProps) {
  const { slug } = await params;
  const me = await getSessionUser();

  if (!me) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <section className="rounded-3xl border border-border bg-surface p-6">
            <h1 className="text-2xl font-semibold">Inicia sesión para editar</h1>
            <p className="mt-2 text-sm opacity-80">Necesitas entrar con tu cuenta para administrar una comunidad.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <section className="rounded-3xl border border-border bg-surface p-6">
            <h1 className="text-2xl font-semibold">Configuración no disponible</h1>
            <p className="mt-2 text-sm opacity-80">La base de datos no está configurada en este entorno.</p>
          </section>
        </main>
      </div>
    );
  }

  const [rows] = await db.query<CommunityRow[]>(
    `SELECT id, slug, name
     FROM Communities
     WHERE slug = ?
     LIMIT 1`,
    [slug.toLowerCase()],
  );

  const community = rows[0];
  if (!community) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <section className="rounded-3xl border border-border bg-surface p-6">
            <h1 className="text-2xl font-semibold">Comunidad no encontrada</h1>
          </section>
        </main>
      </div>
    );
  }

  const access = await getCommunityAccessControl(Number(community.id), me.id);
  const canEdit = Boolean(me.is_admin || access?.permissions.can_edit_community || access?.baseRole === "owner" || access?.baseRole === "admin");

  if (!canEdit) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <section className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6">
            <h1 className="text-2xl font-semibold text-rose-200">Sin permisos</h1>
            <p className="mt-2 text-sm text-rose-200/90">No tienes permisos para editar esta comunidad.</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8">
        <header className="rounded-3xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Editor de comunidad</p>
          <h1 className="text-2xl font-semibold">Editar c/{community.slug}</h1>
          <p className="mt-1 text-sm opacity-70">Ahora la edición está en una sección aparte y más ordenada.</p>
        </header>

        <CommunityEditPanel communityId={Number(community.id)} />
      </main>
    </div>
  );
}
