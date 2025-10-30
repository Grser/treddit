"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth";
import { supportedLocales, useLocale } from "@/contexts/LocaleContext";
import UserBadges from "./UserBadges";

export default function NavbarClient({ session }: { session: SessionUser | null }) {
  const { strings } = useLocale();
  const avatar = session?.avatar_url?.trim() || "/demo-reddit.png";

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
                className="w-full h-10 pl-9 pr-4 rounded-full bg-input text-sm placeholder:text-foreground/60 outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
              />
            </label>
          </form>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <LanguageMenu />
            <IconLink href="/anuncios" title={strings.navbar.ads}>
              <AdIcon />
            </IconLink>
            <IconLink href="/mensajes" title={strings.navbar.messages}>
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

            <IconLink href="/notificaciones" title={strings.navbar.notifications}>
              <BellIcon />
            </IconLink>

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

                <Link
                  href={`/u/${session.username}`}
                  className="hidden sm:inline-flex h-9 items-center rounded-full border border-border px-3 text-sm hover:bg-muted/60"
                >
                  {strings.navbar.profile}
                </Link>

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

                <Link href={`/u/${session.username}`} className="relative inline-flex">
                  <img
                    alt="Usuario"
                    src={avatar}
                    className="size-9 rounded-full ring-1 ring-border object-cover"
                  />
                  {!session.is_admin && !session.is_verified ? null : (
                    <div className="absolute -bottom-1 -right-1">
                      <UserBadges
                        size="sm"
                        isAdmin={session.is_admin}
                        isVerified={session.is_verified}
                        className="gap-0"
                        labels={strings.badges}
                      />
                    </div>
                  )}
                </Link>

                <form method="POST" action="/api/auth/logout">
                  <button className="h-9 px-3 rounded-full border border-border text-sm">
                    {strings.navbar.logout}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="h-9 px-3 rounded-full border border-border text-sm">
                  {strings.navbar.login}
                </Link>
                <Link href="/auth/registrar" className="h-9 px-3 rounded-full bg-brand text-white text-sm">
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

function IconLink({
  href,
  title,
  children,
}: React.PropsWithChildren<{ href: string; title: string }>) {
  return (
    <Link
      href={href}
      title={title}
      className="inline-grid place-items-center size-9 rounded-full hover:bg-muted/60 ring-1 ring-transparent hover:ring-border transition"
    >
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
