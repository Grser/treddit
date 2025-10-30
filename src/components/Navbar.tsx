import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import type { RowDataPacket } from "mysql2";

type HeaderCounts = { notifications: number; messages: number };

export default async function Navbar() {
  const session = await getSessionUser();
  const avatar = session?.avatar_url?.trim() || "/demo-reddit.png";
  const counts: HeaderCounts = session
    ? await getHeaderCounts(session.id)
    : { notifications: 0, messages: 0 };

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center gap-3 h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="inline-grid place-items-center size-8 rounded-full bg-brand text-white font-black">t</span>
            <span className="hidden sm:block font-semibold tracking-tight">Treddit</span>
          </Link>

          {/* Buscador */}
          <form action="/buscar" className="flex-1 hidden md:flex">
            <label className="relative w-full">
              <svg aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                name="q"
                type="search"
                placeholder="Buscar en Treddit"
                className="w-full h-10 pl-9 pr-4 rounded-full bg-input text-sm placeholder:text-foreground/60 outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
              />
            </label>
          </form>

          {/* Acciones derecha */}
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <IconBtn title="Idioma" href="/idioma">
              <LangIcon />
            </IconBtn>
            <IconBtn title="Anuncios" href="/anuncios">
              <AdIcon />
            </IconBtn>
            <IconBtn
              title="Mensajes"
              href="/mensajes"
              badge={counts.messages > 0 ? counts.messages : undefined}
            >
              <ChatIcon />
            </IconBtn>
            <div className="hidden sm:block h-6 w-px bg-border mx-1" />

            {/* Botón Crear: solo habilitado con sesión */}
            {session ? (
              <Link
                href="/crear"
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-brand text-white text-sm font-medium hover:brightness-110"
                title="Crear"
              >
                <PlusIcon /> Crear
              </Link>
            ) : (
              <button
                type="button"
                title="Inicia sesión para publicar"
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-brand/40 text-white/80 text-sm font-medium cursor-not-allowed"
                disabled
              >
                <PlusIcon /> Crear
              </button>
            )}

            <IconBtn
              title="Notificaciones"
              href="/notificaciones"
              badge={counts.notifications > 0 ? counts.notifications : undefined}
            >
              <BellIcon />
            </IconBtn>

            {/* Autenticación */}
            {session ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm opacity-80">@{session.username}</span>
                <img
                  alt="Usuario"
                  src={avatar}
                  className="size-9 rounded-full ring-1 ring-border object-cover"
                />
                {/* Logout simple via POST */}
                <form method="POST" action="/api/auth/logout">
                  <button className="h-9 px-3 rounded-full border border-border text-sm">Salir</button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="h-9 px-3 rounded-full border border-border text-sm">Entrar</Link>
                <Link href="/auth/registrar" className="h-9 px-3 rounded-full bg-brand text-white text-sm">Registrar</Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

/* --- Botón de icono genérico --- */
type IconBtnProps = React.PropsWithChildren<{ title: string; href?: string; badge?: number }>;

function IconBtn({ title, href, badge, children }: IconBtnProps) {
  const className =
    "relative inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition";
  const content = (
    <>
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[10px] leading-4 font-semibold text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} title={title} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" title={title} className={className}>
      {content}
    </button>
  );
}

/* --- Iconos SVG --- */
function PlusIcon() { return (<svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>); }
function BellIcon() { return (<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 6 3 9H3c0-3 3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>); }
function ChatIcon() { return (<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>); }
function AdIcon() { return (<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h6M7 16h4" /></svg>); }
function LangIcon() { return (<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>); }

type CountRow = RowDataPacket & { total: number | null };

async function getHeaderCounts(userId: number): Promise<HeaderCounts> {
  const [[followers], [posts], [replies]] = await Promise.all([
    db.query<CountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM Follows
      WHERE followed=? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `,
      [userId]
    ),
    db.query<CountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM Posts
      WHERE user IN (
        SELECT followed FROM Follows WHERE follower=?
      ) AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `,
      [userId]
    ),
    db.query<CountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM Comments c
      JOIN Posts p ON p.id = c.post
      WHERE p.user=? AND c.user<>? AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `,
      [userId, userId]
    ),
  ]);

  const followerEvents = Number((followers?.[0]?.total ?? 0) || 0);
  const newPosts = Number((posts?.[0]?.total ?? 0) || 0);
  const newReplies = Number((replies?.[0]?.total ?? 0) || 0);

  return {
    notifications: followerEvents + newPosts,
    messages: newReplies,
  };
}
