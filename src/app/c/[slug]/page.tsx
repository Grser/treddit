import type { RowDataPacket } from "mysql2";

import CommunityChat from "@/components/community/CommunityChat";
import CommunityChannelsHub from "@/components/community/CommunityChannelsHub";
import JoinCommunityButton from "@/components/community/JoinCommunityButton";
import PromoteSelfCommunityButton from "@/components/community/PromoteSelfCommunityButton";
import CommunityShareButton from "@/components/community/CommunityShareButton";
import Navbar from "@/components/Navbar";
import Feed from "@/components/Feed";
import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";
import type { Post as PostCardType } from "@/components/PostCard";
import { getCommunityAccessControl } from "@/lib/communityPermissions";

export const dynamic = "force-dynamic";


type CommunityPageProps = {
  params: Promise<{ slug: string }>;
};

type Community = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
  members: number;
  isMember: boolean;
  myRole: string | null;
  visible: boolean;
  isVerified: boolean;
};

type Moderator = {
  id: number;
  username: string;
  nickname: string | null;
  role: string | null;
};

type FeedResponse = { items: PostCardType[] };

type CommunityViewModel = Community & {
  moderators: Moderator[];
  initialPosts: PostCardType[];
  accessControl: {
    canEditCommunity: boolean;
    canManageRoles: boolean;
    canChat: boolean;
    isMuted: boolean;
  } | null;
};

type CommunityRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  created_at: Date | string;
  visible: number;
  is_verified?: number;
  members: number;
  isMember: number;
  myRole: string | null;
};

type ModeratorRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  role: string | null;
};

function formatRole(role: string | null) {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized === "owner") return "Fundador";
  if (normalized === "admin") return "Administrador";
  if (normalized === "moderator") return "Moderador";
  return null;
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const me = await getSessionUser();

  if (!isDatabaseConfigured()) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 space-y-4">
          <h1 className="text-2xl font-semibold">Comunidades no configuradas</h1>
          <p className="text-sm opacity-70">
            Para explorar comunidades necesitas configurar la base de datos. Mientras tanto puedes usar la sección de Popular o
            Explorar.
          </p>
        </main>
      </div>
    );
  }

  const baseUrl = await getRequestBaseUrl();
  const data = await loadCommunity(slug, me?.id ?? null, baseUrl);
  if (!data) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 space-y-4">
          <h1 className="text-2xl font-semibold">Comunidad no encontrada</h1>
          <p className="text-sm opacity-70">Verifica que el identificador sea correcto o crea una nueva comunidad.</p>
        </main>
      </div>
    );
  }

  const { initialPosts, moderators, ...community } = data;
  const canInteract = Boolean(me);
  const isAuthorized = community.visible || community.isMember || me?.is_admin;
  const isCommunityManager = Boolean(community.myRole) && community.myRole !== "member";
  const canEditCommunity = Boolean(me?.is_admin || community.accessControl?.canEditCommunity || isCommunityManager);
  const canWriteInChat = Boolean(me?.is_admin || (community.accessControl?.canChat && !community.accessControl?.isMuted));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="bg-gradient-to-r from-brand/20 via-sky-500/10 to-violet-500/15 px-6 py-7">
            <p className="text-xs uppercase tracking-[0.15em] text-foreground/60">Comunidad</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{community.name}</h1>
              {community.isVerified && (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  ✓ Comunidad verificada
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground/70">treddit.clawn.cat/c/{community.slug}</p>
          </div>

          <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
                  {community.members.toLocaleString()} miembros
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
                  Creada el {new Date(community.created_at).toLocaleDateString()}
                </span>
                <span className={`rounded-full border px-3 py-1 ${community.visible ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                  {community.visible ? "Pública" : "Privada"}
                </span>
                {community.myRole && (
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-brand">
                    {formatRole(community.myRole) || community.myRole}
                  </span>
                )}
              </div>
              {community.description && (
                <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm text-foreground/80">{community.description}</p>
              )}
            </div>
            {isAuthorized ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[20rem]">
                <JoinCommunityButton
                  communityId={community.id}
                  initiallyMember={community.isMember}
                  canInteract={canInteract}
                />
                <CommunityShareButton communitySlug={community.slug} communityName={community.name} canInteract={canInteract} />
                {canEditCommunity && (
                  <a
                    href={`/c/${community.slug}/editar`}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
                  >
                    Editar comunidad
                  </a>
                )}
                {me?.is_admin && (
                  <PromoteSelfCommunityButton
                    communityId={community.id}
                    alreadyManager={isCommunityManager}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-full border border-border px-5 py-2 text-sm text-foreground/80">
                Comunidad privada
                {!canInteract && <span className="ml-2 text-blue-500">Inicia sesión para solicitar acceso</span>}
              </div>
            )}
          </div>
        </header>

        {!community.visible && !community.isMember && !me?.is_admin ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Esta comunidad está actualmente oculta. Solo sus miembros pueden acceder a su contenido.
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-4 rounded-3xl border border-border bg-surface/40 p-3 sm:p-4">
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <h2 className="text-base font-semibold">Publicaciones recientes</h2>
                <p className="text-xs opacity-70">Novedades de la comunidad en tiempo real.</p>
              </div>
              {initialPosts.length > 0 ? (
                <Feed
                  canInteract={canInteract}
                  communityId={community.id}
                  initialItems={initialPosts}
                />
              ) : (
                <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-foreground/70">
                  Aún no hay publicaciones en esta comunidad.
                </div>
              )}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <CommunityChannelsHub />

              <CommunityChat
                communityId={community.id}
                canInteract={canInteract}
                canWrite={Boolean(me?.is_admin || (community.isMember && canWriteInChat))}
              />

              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-lg font-semibold">Equipo de moderación</h2>
                <p className="mt-1 text-xs opacity-70">Personas encargadas de las reglas y seguridad.</p>
                {moderators.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {moderators.map((mod) => (
                      <li key={mod.id} className="flex items-center justify-between gap-2">
                        <a href={`/u/${mod.username}`} className="truncate hover:underline">
                          {mod.nickname || mod.username}
                        </a>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/70">
                          {formatRole(mod.role) || "Moderador"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-foreground/60">Nadie está moderando esta comunidad todavía.</p>
                )}
              </section>

            </aside>
          </section>
        )}
      </main>
    </div>
  );
}

async function loadCommunity(slug: string, viewerId: number | null, baseUrl: string): Promise<CommunityViewModel | null> {
  const normalized = slug.toLowerCase();
  const [verifiedColumnRows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Communities LIKE 'is_verified'");
  const hasVerifiedColumn = verifiedColumnRows.length > 0;
  const [rows] = await db.query<CommunityRow[]>(
    `
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      c.created_at,
      c.visible,
      ${hasVerifiedColumn ? "c.is_verified" : "0 AS is_verified"},
      (SELECT COUNT(*) FROM Community_Members cm WHERE cm.community_id = c.id) AS members,
      CASE WHEN ? IS NULL THEN 0 ELSE EXISTS(
        SELECT 1 FROM Community_Members cm WHERE cm.community_id = c.id AND cm.user_id = ?
      ) END AS isMember,
      (
        SELECT cm.role FROM Community_Members cm
        WHERE cm.community_id = c.id AND cm.user_id = ?
        LIMIT 1
      ) AS myRole
    FROM Communities c
    WHERE c.slug = ?
    LIMIT 1
    `,
    [viewerId, viewerId, viewerId, normalized]
  );

  const row = rows[0];
  if (!row) return null;

  const community: Community = {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    created_at: new Date(row.created_at).toISOString(),
    members: Number(row.members) || 0,
    visible: Boolean(row.visible),
    isVerified: Boolean(row.is_verified),
    isMember: Boolean(row.isMember),
    myRole: row.myRole ? String(row.myRole) : null,
  };

  const [modsRows] = await db.query<ModeratorRow[]>(
    `
    SELECT u.id, u.username, u.nickname, cm.role
    FROM Community_Members cm
    JOIN Users u ON u.id = cm.user_id
    WHERE cm.community_id = ? AND cm.role <> 'member'
    ORDER BY FIELD(cm.role, 'owner','admin','moderator'), u.username ASC
    LIMIT 50
    `,
    [community.id]
  );

  const moderators = modsRows.map((mod) => ({
    id: Number(mod.id),
    username: String(mod.username),
    nickname: mod.nickname ? String(mod.nickname) : null,
    role: mod.role ? String(mod.role) : null,
  }));

  const feed = await getCommunityFeed(community.id, baseUrl);
  const accessControl = viewerId
    ? await getCommunityAccessControl(community.id, viewerId)
    : null;

  return {
    ...community,
    moderators,
    initialPosts: feed.items,
    accessControl: accessControl
      ? {
        canEditCommunity: accessControl.permissions.can_edit_community,
        canManageRoles: accessControl.permissions.can_manage_roles,
        canChat: accessControl.permissions.can_chat,
        isMuted: accessControl.isMuted,
      }
      : null,
  };
}

async function getCommunityFeed(communityId: number, baseUrl: string): Promise<FeedResponse> {
  const res = await fetch(`${baseUrl}/api/posts?communityId=${communityId}&limit=20`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return { items: [] };
  }
  return (await res.json()) as FeedResponse;
}
