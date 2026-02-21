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

type LightPaletteKey = "official" | "purple-night" | "ocean" | "graphite" | "custom";

type CustomPalette = {
  app: string;
  surface: string;
  input: string;
  border: string;
  foreground: string;
  brand: string;
};

const CUSTOM_PALETTE_DEFAULT: CustomPalette = {
  app: "#f8fafc",
  surface: "#ffffff",
  input: "#f1f5f9",
  border: "#e5e7eb",
  foreground: "#0b0f19",
  brand: "#a81700",
};

const LIGHT_PALETTES: Array<{ key: LightPaletteKey; label: string }> = [
  { key: "official", label: "Oficial" },
  { key: "purple-night", label: "Morado Noche" },
  { key: "ocean", label: "Azul Océano" },
  { key: "graphite", label: "Negro Grafito" },
  { key: "custom", label: "Personalizado" },
];

export default function NavbarClient({ session }: { session?: SessionUser | null }) {
  const { strings } = useLocale();
  const [resolvedSession, setResolvedSession] = useState<SessionUser | null | undefined>(session);
  const avatar = resolvedSession?.avatar_url?.trim() || "/demo-reddit.png";
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedLightPalette, setSelectedLightPalette] = useState<LightPaletteKey>("official");
  const [customPalette, setCustomPalette] = useState<CustomPalette>(CUSTOM_PALETTE_DEFAULT);
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

    const savedPalette = window.localStorage.getItem("treddit-light-palette");
    const palette: LightPaletteKey =
      savedPalette === "official" ||
      savedPalette === "purple-night" ||
      savedPalette === "ocean" ||
      savedPalette === "graphite" ||
      savedPalette === "custom"
        ? savedPalette
        : "official";
    setSelectedLightPalette(palette);
    document.documentElement.dataset.lightPalette = palette;

    const savedCustomPalette = window.localStorage.getItem("treddit-light-custom");
    if (savedCustomPalette) {
      try {
        const parsed = JSON.parse(savedCustomPalette) as Partial<CustomPalette>;
        const nextCustom: CustomPalette = {
          app: parsed.app ?? CUSTOM_PALETTE_DEFAULT.app,
          surface: parsed.surface ?? CUSTOM_PALETTE_DEFAULT.surface,
          input: parsed.input ?? CUSTOM_PALETTE_DEFAULT.input,
          border: parsed.border ?? CUSTOM_PALETTE_DEFAULT.border,
          foreground: parsed.foreground ?? CUSTOM_PALETTE_DEFAULT.foreground,
          brand: parsed.brand ?? CUSTOM_PALETTE_DEFAULT.brand,
        };
        setCustomPalette(nextCustom);
        applyCustomPalette(nextCustom);
      } catch {
        setCustomPalette(CUSTOM_PALETTE_DEFAULT);
        applyCustomPalette(CUSTOM_PALETTE_DEFAULT);
      }
    } else {
      applyCustomPalette(CUSTOM_PALETTE_DEFAULT);
    }
  }, []);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("treddit-theme", next ? "dark" : "light");
  }

  function applyCustomPalette(palette: CustomPalette) {
    const root = document.documentElement;
    root.style.setProperty("--custom-app", palette.app);
    root.style.setProperty("--custom-surface", palette.surface);
    root.style.setProperty("--custom-input", palette.input);
    root.style.setProperty("--custom-border", palette.border);
    root.style.setProperty("--custom-foreground", palette.foreground);
    root.style.setProperty("--custom-brand", palette.brand);
    root.style.setProperty("--color-brand", palette.brand);
  }

  function changeLightPalette(palette: LightPaletteKey) {
    setSelectedLightPalette(palette);
    document.documentElement.dataset.lightPalette = palette;
    window.localStorage.setItem("treddit-light-palette", palette);
  }

  function updateCustomColor(key: keyof CustomPalette, value: string) {
    setCustomPalette((prev) => {
      const next = { ...prev, [key]: value };
      applyCustomPalette(next);
      window.localStorage.setItem("treddit-light-custom", JSON.stringify(next));
      return next;
    });

    if (selectedLightPalette !== "custom") {
      changeLightPalette("custom");
    }
  }

  useEffect(() => {
    setResolvedSession(session);
  }, [session]);

  useEffect(() => {
    let active = true;

    async function resolveSession() {
      const hasSessionCookie = document.cookie
        .split(";")
        .some((cookie) => cookie.trim().startsWith("treddit_token="));

      if (!hasSessionCookie) {
        setResolvedSession(null);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!active) return;
          setResolvedSession(null);
          return;
        }
        const payload = (await res.json().catch(() => ({}))) as { user?: SessionUser | null };
        if (!active) return;
        setResolvedSession(payload.user ?? null);
      } catch {
        if (!active) return;
        setResolvedSession(null);
      }
    }

    if (session !== undefined) return;
    void resolveSession();

    return () => {
      active = false;
    };
  }, [session]);

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

    if (!resolvedSession?.id) return;

    timeoutId = setTimeout(load, 500);
    const interval = setInterval(load, 15_000);
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [resolvedSession?.id]);

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
      if (!resolvedSession?.id) return;
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

    if (!resolvedSession?.id) return;

    timeoutId = setTimeout(loadNotifications, 800);
    const interval = setInterval(loadNotifications, 20_000);
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [resolvedSession?.id]);

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
            <AppearanceMenu
              isDarkMode={isDarkMode}
              selectedLightPalette={selectedLightPalette}
              customPalette={customPalette}
              onToggleTheme={toggleTheme}
              onChangeLightPalette={changeLightPalette}
              onUpdateCustomColor={updateCustomColor}
            />
            <div className="hidden sm:block">
              <LanguageMenu />
            </div>
            <div className="hidden sm:block">
              <IconLink href="/anuncios" title={strings.navbar.ads}>
                <AdIcon />
              </IconLink>
            </div>
            <IconLink href="/mensajes" title={strings.navbar.messages} badge={unreadMessages}>
              <ChatIcon />
            </IconLink>
            <div className="hidden sm:block h-6 w-px bg-border mx-1" />
            {resolvedSession ? (
              <Link
                href="/crear"
                className="inline-grid size-9 place-items-center rounded-full bg-brand text-white sm:hidden"
                title={strings.navbar.create}
              >
                <PlusIcon />
              </Link>
            ) : null}


            {resolvedSession ? (
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

            {resolvedSession ? (
              <div className="flex items-center gap-3">
                {resolvedSession.is_admin && (
                  <Link
                    href="/admin"
                    className="hidden lg:inline-flex h-9 items-center rounded-full border border-border px-3 text-sm hover:bg-muted/60"
                  >
                    {strings.navbar.admin}
                  </Link>
                )}

                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm opacity-80">
                    {strings.navbar.userGreeting(resolvedSession.username)}
                  </span>
                  <UserBadges
                    size="sm"
                    isAdmin={resolvedSession.is_admin}
                    isVerified={resolvedSession.is_verified}
                    labels={strings.badges}
                  />
                </div>

                <Link href={`/u/${resolvedSession.username}`} className="inline-flex">
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
                  <button className="hidden h-9 items-center justify-center rounded-full border border-border px-3 text-sm sm:inline-flex">
                    {strings.navbar.logout}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-sm"
                >
                  {strings.navbar.login}
                </Link>
                <Link
                  href="/auth/registrar"
                  className="hidden h-9 items-center justify-center rounded-full bg-brand px-3 text-sm text-white sm:inline-flex"
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

function AppearanceMenu({
  isDarkMode,
  selectedLightPalette,
  customPalette,
  onToggleTheme,
  onChangeLightPalette,
  onUpdateCustomColor,
}: {
  isDarkMode: boolean;
  selectedLightPalette: LightPaletteKey;
  customPalette: CustomPalette;
  onToggleTheme: () => void;
  onChangeLightPalette: (palette: LightPaletteKey) => void;
  onUpdateCustomColor: (key: keyof CustomPalette, value: string) => void;
}) {
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
        title="Apariencia"
        aria-label="Opciones de apariencia"
        className="inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition"
        onClick={() => setOpen((value) => !value)}
      >
        <PaletteIcon />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg z-50">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Apariencia</p>

          <button
            type="button"
            onClick={onToggleTheme}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-sm hover:brightness-105"
          >
            <span>{isDarkMode ? "Modo oscuro" : "Modo claro"}</span>
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          <label htmlFor="light-palette" className="mt-3 block text-xs opacity-80">
            Paleta de modo claro
          </label>
          <select
            id="light-palette"
            value={selectedLightPalette}
            onChange={(event) => onChangeLightPalette(event.target.value as LightPaletteKey)}
            disabled={isDarkMode}
            className="mt-1 w-full rounded-md border border-border bg-input px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {LIGHT_PALETTES.map((palette) => (
              <option key={palette.key} value={palette.key}>
                {palette.label}
              </option>
            ))}
          </select>

          {!isDarkMode && selectedLightPalette === "custom" && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(Object.keys(customPalette) as Array<keyof CustomPalette>).map((key) => (
                <label key={key} className="rounded-lg border border-border bg-input p-2 text-center text-[11px] capitalize" title={`Color ${key}`}>
                  <span className="mb-1 block truncate">{key.replace("_", " ")}</span>
                  <input
                    type="color"
                    value={customPalette[key]}
                    onChange={(event) => onUpdateCustomColor(key, event.target.value)}
                    className="h-7 w-full cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                </label>
              ))}
            </div>
          )}

          {(isDarkMode || selectedLightPalette !== "custom") && (
            <label className="mt-3 block rounded-lg border border-border bg-input p-2 text-center text-[11px]" title="Color de marca">
              <span className="mb-1 block">Color de marca</span>
              <input
                type="color"
                value={customPalette.brand}
                onChange={(event) => onUpdateCustomColor("brand", event.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </label>
          )}
        </div>
      )}
    </div>
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


function PaletteIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a9 9 0 0 0 0 18h1a3 3 0 0 0 0-6h-1a2 2 0 1 1 0-4h4a5 5 0 0 0 0-10h-4z" />
      <circle cx="6.5" cy="10" r="1" />
      <circle cx="9" cy="7" r="1" />
      <circle cx="13" cy="7" r="1" />
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
