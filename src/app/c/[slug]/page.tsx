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
  iconUrl: string | null;
  bannerUrl: string | null;
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
    canManageVoiceChannels: boolean;
    canChat: boolean;
    isMuted: boolean;
  } | null;
};

type CommunityRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_url?: string | null;
  banner_url?: string | null;
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
  const canManageVoiceChannels = Boolean(me?.is_admin || community.accessControl?.canManageVoiceChannels || isCommunityManager);
  const initials = community.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-5 sm:px-4 sm:py-8">
        <header className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/70 shadow-xl shadow-black/10">
          <div
            className="relative min-h-[12rem] overflow-hidden sm:min-h-[16rem] lg:min-h-[18rem]"
            style={community.bannerUrl ? { backgroundImage: `url(${community.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <div className={`absolute inset-0 ${community.bannerUrl ? "bg-gradient-to-t from-black/75 via-black/35 to-black/20" : "bg-gradient-to-br from-brand/35 via-fuchsia-500/25 to-cyan-500/20"}`} />
            <div className="relative flex h-full items-end px-4 pb-4 pt-8 sm:px-6 sm:pb-6 lg:px-8">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3 sm:gap-4">
                  <div
                    className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/70 bg-background/40 text-2xl font-bold text-white shadow-lg backdrop-blur sm:size-24"
                    style={community.iconUrl ? { backgroundImage: `url(${community.iconUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {!community.iconUrl && initials}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.17em] text-white/70">Comunidad</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">{community.name}</h1>
                    <p className="mt-1 text-sm text-white/75">c/{community.slug}</p>
                  </div>
                </div>
                {community.isVerified && (
                  <span className="inline-flex w-fit items-center rounded-full border border-emerald-300/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur">
                    ✓ Comunidad verificada
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <span className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-foreground/75 sm:text-sm">
                  <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-foreground/55">Miembros</span>
                  {community.members.toLocaleString()} miembros
                </span>
                <span className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-foreground/75 sm:text-sm">
                  <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-foreground/55">Creación</span>
                  Creada el {new Date(community.created_at).toLocaleDateString()}
                </span>
                <span className={`rounded-2xl border px-3 py-2 text-xs sm:text-sm ${community.visible ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                  <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-current/80">Visibilidad</span>
                  {community.visible ? "Pública" : "Privada"}
                </span>
                {community.myRole && (
                  <span className="rounded-2xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand sm:text-sm">
                    <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-brand/80">Tu rol</span>
                    {formatRole(community.myRole) || community.myRole}
                  </span>
                )}
              </div>
              {community.description && (
                <p className="max-w-4xl whitespace-pre-wrap rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-sm text-foreground/80">
                  {community.description}
                </p>
              )}
            </div>

            {isAuthorized ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[22rem]">
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
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-surface/60 p-3 sm:p-4">
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
                  <div className="mt-3 rounded-2xl border border-border bg-surface p-6 text-sm text-foreground/70">
                    Aún no hay publicaciones en esta comunidad.
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <CommunityChannelsHub
                communityId={community.id}
                canCreate={canManageVoiceChannels}
                canInteract={Boolean(canInteract && community.isMember)}
              />

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
  const [iconColumnRows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Communities LIKE 'icon_url'");
  const [bannerColumnRows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Communities LIKE 'banner_url'");
  const hasVerifiedColumn = verifiedColumnRows.length > 0;
  const hasIconColumn = iconColumnRows.length > 0;
  const hasBannerColumn = bannerColumnRows.length > 0;
  const [rows] = await db.query<CommunityRow[]>(
    `
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      ${hasIconColumn ? "c.icon_url" : "NULL AS icon_url"},
      ${hasBannerColumn ? "c.banner_url" : "NULL AS banner_url"},
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
    iconUrl: row.icon_url ? String(row.icon_url) : null,
    bannerUrl: row.banner_url ? String(row.banner_url) : null,
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
        canManageVoiceChannels: accessControl.permissions.can_manage_voice_channels,
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
