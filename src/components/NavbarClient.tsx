"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth";
import { supportedLocales, useLocale } from "@/contexts/LocaleContext";
import UserBadges from "./UserBadges";

type HeaderNotification = {
  id: string;
  type: "follow" | "like" | "repost" | "ad" | "mention";
  created_at: string;
  username: string | null;
  nickname: string | null;
  post_id: number | null;
  text: string | null;
};

export default function NavbarClient({ session }: { session: SessionUser | null }) {
  const { strings } = useLocale();
  const avatar = session?.avatar_url?.trim() || "/demo-reddit.png";
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("treddit-theme");
    const shouldUseDark =
      savedTheme === "dark" ||
      (savedTheme !== "light" && document.documentElement.classList.contains("dark"));
    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDarkMode(shouldUseDark);
  }, []);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("treddit-theme", next ? "dark" : "light");
  }

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const res = await fetch("/api/messages/summary", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { unread?: number };
        if (!active) return;
        setUnreadMessages(Math.max(0, Number(payload.unread) || 0));
      } catch {
        if (!active) return;
        setUnreadMessages(0);
      }
    }

    if (!session?.id) return;

    timeoutId = setTimeout(load, 500);
    const interval = setInterval(load, 15_000);
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [session?.id]);

  useEffect(() => {
    function handleRead() {
      setUnreadMessages(0);
    }
    window.addEventListener("treddit:messages-read", handleRead);
    return () => window.removeEventListener("treddit:messages-read", handleRead);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;

    function handleClick(event: MouseEvent) {
      if (!notificationBox.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function loadNotifications() {
      if (!session?.id) return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { items?: HeaderNotification[]; unreadCount?: number };
        if (!active) return;
        setNotifications(Array.isArray(payload.items) ? payload.items : []);
        setNotificationUnreadCount(Math.max(0, Number(payload.unreadCount) || 0));
      } catch {
        if (!active) return;
        setNotifications([]);
        setNotificationUnreadCount(0);
      }
    }

    if (!session?.id) return;

    timeoutId = setTimeout(loadNotifications, 800);
    const interval = setInterval(loadNotifications, 20_000);
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [session?.id]);

  async function markNotificationsAsRead() {
    setNotificationUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read" }),
      });
    } catch {
      // noop
    }
  }


  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center gap-3 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="inline-grid place-items-center size-8 rounded-full bg-brand text-white font-black">t</span>
            <span className="hidden sm:block font-semibold tracking-tight">{strings.navbar.brand}</span>
          </Link>

          <form action="/buscar" className="flex-1 hidden md:flex">
            <label className="relative w-full">
              <svg
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                name="q"
                type="search"
                placeholder={strings.navbar.searchPlaceholder}
                className="w-full h-10 pl-10 pr-4 rounded-full border border-border bg-input text-sm placeholder:text-foreground/60 outline-none ring-1 ring-transparent transition focus:border-brand/50 focus:ring-brand/40"
              />
            </label>
          </form>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              title={isDarkMode ? strings.navbar.themeToLight : strings.navbar.themeToDark}
              aria-label={strings.navbar.themeLabel}
              className="inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition"
              onClick={toggleTheme}
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            <LanguageMenu />
            <IconLink href="/anuncios" title={strings.navbar.ads}>
              <AdIcon />
            </IconLink>
            <IconLink href="/mensajes" title={strings.navbar.messages} badge={unreadMessages}>
              <ChatIcon />
            </IconLink>
            <div className="hidden sm:block h-6 w-px bg-border mx-1" />

            {session ? (
              <Link
                href="/crear"
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-brand text-white text-sm font-medium hover:brightness-110"
                title={strings.navbar.create}
              >
                <PlusIcon /> {strings.navbar.create}
              </Link>
            ) : (
              <button
                type="button"
                title={strings.navbar.createDisabled}
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-brand/40 text-white/80 text-sm font-medium cursor-not-allowed"
                disabled
              >
                <PlusIcon /> {strings.navbar.create}
              </button>
            )}

            <div className="relative" ref={notificationBox}>
              <button
                type="button"
                title={strings.navbar.notifications}
                onClick={() => {
                  const next = !notificationsOpen;
                  setNotificationsOpen(next);
                  if (next) {
                    void markNotificationsAsRead();
                  }
                }}
                className="relative inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition"
              >
                {notificationUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                    {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                  </span>
                )}
                <BellIcon />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-surface p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Notificaciones</p>
                    <Link href="/notificaciones" className="text-xs text-blue-400 hover:underline">Ver todo</Link>
                  </div>
                  <ul className="max-h-80 space-y-2 overflow-auto">
                    {notifications.length === 0 ? (
                      <li className="rounded-xl bg-muted/50 px-3 py-2 text-xs opacity-70">Sin novedades por ahora.</li>
                    ) : (
                      notifications.map((item) => (
                        <li key={item.id} className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs">
                          <p className="font-medium">
                            {item.type === "ad" ? "📣 Nuevo anuncio" : item.type === "follow" ? "👥 Nuevo seguidor" : item.type === "repost" ? "🔁 Repost" : item.type === "mention" ? "🏷️ Te mencionaron" : "❤️ Nuevo like"}
                          </p>
                          <p className="mt-0.5 opacity-80">
                            {(item.nickname || item.username || "Treddit")}
                            {item.text ? ` · ${item.text.slice(0, 80)}` : ""}
                          </p>
                          {item.post_id ? (
                            <Link href={`/p/${item.post_id}`} className="mt-1 inline-flex text-[11px] text-blue-400 hover:underline">Abrir</Link>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            {session ? (
              <div className="flex items-center gap-3">
                {session.is_admin && (
                  <Link
                    href="/admin"
                    className="hidden lg:inline-flex h-9 items-center rounded-full border border-border px-3 text-sm hover:bg-muted/60"
                  >
                    {strings.navbar.admin}
                  </Link>
                )}

                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm opacity-80">
                    {strings.navbar.userGreeting(session.username)}
                  </span>
                  <UserBadges
                    size="sm"
                    isAdmin={session.is_admin}
                    isVerified={session.is_verified}
                    labels={strings.badges}
                  />
                </div>

                <Link href={`/u/${session.username}`} className="inline-flex">
                  <Image
                    alt="Usuario"
                    src={avatar}
                    width={36}
                    height={36}
                    className="size-9 rounded-full ring-1 ring-border object-cover"
                    unoptimized
                  />
                </Link>

                <form method="POST" action="/api/auth/logout">
                  <button className="inline-flex h-9 items-center justify-center px-3 rounded-full border border-border text-sm">
                    {strings.navbar.logout}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="inline-flex h-9 items-center justify-center px-3 rounded-full border border-border text-sm"
                >
                  {strings.navbar.login}
                </Link>
                <Link
                  href="/auth/registrar"
                  className="inline-flex h-9 items-center justify-center px-3 rounded-full bg-brand text-white text-sm"
                >
                  {strings.navbar.register}
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3c-.06.3-.09.61-.09.93A7.5 7.5 0 0 0 20.07 13c.32 0 .63-.03.93-.09z" />
    </svg>
  );
}

function IconLink({
  href,
  title,
  children,
  badge = 0,
}: React.PropsWithChildren<{ href: string; title: string; badge?: number }>) {
  return (
    <Link
      href={href}
      title={title}
      className="relative inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition"
    >
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {children}
    </Link>
  );
}

function LanguageMenu() {
  const { locale, setLocale, strings } = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        title={strings.navbar.languageLabel}
        className="inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition"
        onClick={() => setOpen((v) => !v)}
      >
        <LangIcon />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-surface shadow-lg p-1 z-50">
          {supportedLocales.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setLocale(option.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded hover:bg-muted/60 text-sm ${
                locale === option.code ? "font-semibold" : ""
              }`}
            >
              <span>{option.label}</span>
              {locale === option.code && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 6 3 9H3c0-3 3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

function AdIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h6M7 16h4" />
    </svg>
  );
}

function LangIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}
