import { headers } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

type MaybeNextRequest = Request & { nextUrl?: URL };

export const OAUTH_STATE_COOKIE = "oauth_state" as const;
export const OAUTH_ORIGIN_COOKIE = "oauth_origin" as const;

function normalizeOrigin(value: string | URL | null | undefined) {
  if (!value) return null;
  try {
    const url = typeof value === "string" ? new URL(value) : value;
    if (!url.protocol.startsWith("http")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getForwardedFromForwardedHeader(req: Request) {
  const header = req.headers.get("forwarded");
  if (!header) return null;

  for (const segment of header.split(",")) {
    let proto: string | undefined;
    let host: string | undefined;
    for (const part of segment.split(";")) {
      const [rawKey, rawValue] = part.split("=");
      if (!rawKey || !rawValue) continue;
      const key = rawKey.trim().toLowerCase();
      const value = rawValue.trim().replace(/^"|"$/g, "");
      if (key === "proto") proto = value;
      else if (key === "host") host = value;
    }
    if (host) {
      const candidate = buildOrigin(host, proto, req);
      if (candidate) return candidate;
    }
  }

  return null;
}

function getForwardedHost(req: Request) {
  const forwardedHost =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("x-original-host") ??
    req.headers.get("x-forwarded-server");
  return forwardedHost?.split(",")[0]?.trim() || null;
}

function getForwardedProto(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProto) return forwardedProto;

  const cfVisitor = req.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor) as { scheme?: string };
      if (parsed.scheme) return parsed.scheme;
    } catch (err) {
      console.error("Invalid cf-visitor header", err);
    }
  }

  return null;
}


function isLocalOrigin(value: string | null) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function isLocalHost(host: string | null) {
  if (!host) return false;
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function buildOrigin(host: string, proto: string | null | undefined, req: Request) {
  if (!host) return null;
  const forwardedPort = req.headers.get("x-forwarded-port")?.split(",")[0]?.trim();
  let authority = host;
  if (forwardedPort && !authority.includes(":")) {
    authority = `${authority}:${forwardedPort}`;
  }

  const protocol = proto || (req.url.startsWith("https") ? "https" : "http");
  try {
    return new URL(`${protocol}://${authority}`).origin;
  } catch (err) {
    console.error("Invalid forwarded origin", err);
    return null;
  }
}

export function getBaseUrl(req: Request | NextRequest) {
  // Preferred variables for OAuth origin detection (most explicit first).
  const configuredBase =
    process.env.GOOGLE_OAUTH_BASE_URL?.trim() ||
    process.env.AUTH_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "");

  const normalizedConfigured = normalizeOrigin(configuredBase || null);

  const withNext = req as MaybeNextRequest;
  const nextOrigin = normalizeOrigin(withNext.nextUrl?.origin ?? null);

  if (normalizedConfigured && !isLocalOrigin(normalizedConfigured)) {
    return normalizedConfigured;
  }

  const forwardedHeaderOrigin = getForwardedFromForwardedHeader(req);
  if (forwardedHeaderOrigin && !isLocalOrigin(forwardedHeaderOrigin)) return forwardedHeaderOrigin;

  const forwardedHost = getForwardedHost(req);
  const forwardedProto = getForwardedProto(req);
  const forwardedOrigin = buildOrigin(forwardedHost ?? "", forwardedProto, req);
  if (forwardedOrigin && !isLocalOrigin(forwardedOrigin) && (!normalizedConfigured || isLocalOrigin(normalizedConfigured))) {
    return forwardedOrigin;
  }

  if (normalizedConfigured) return normalizedConfigured;

  const headerOrigin = normalizeOrigin(req.headers.get("origin"));
  if (headerOrigin && !isLocalOrigin(headerOrigin)) return headerOrigin;

  const refererOrigin = normalizeOrigin(req.headers.get("referer"));
  if (refererOrigin && !isLocalOrigin(refererOrigin)) return refererOrigin;

  const hostHeader = req.headers.get("host")?.trim();
  const hostOrigin = buildOrigin(hostHeader ?? "", forwardedProto, req);
  if (hostOrigin && !isLocalOrigin(hostOrigin)) return hostOrigin;

  if (nextOrigin && !isLocalOrigin(nextOrigin)) return nextOrigin;

  const requestOrigin = normalizeOrigin(req.url);
  if (requestOrigin && !isLocalOrigin(requestOrigin)) return requestOrigin;

  return "https://treddit.com";
}

export async function getRedirectUri(baseUrl: string, req?: Request) {
  const normalizedBase = normalizeOrigin(baseUrl);
  const requestOrigin = req ? normalizeOrigin(req.url) : null;
  const envBase = normalizeOrigin(process.env.NEXT_PUBLIC_BASE_URL || null);
  const firstNonLocalBase = [normalizedBase, requestOrigin, envBase].find(
    (origin): origin is string => Boolean(origin && !isLocalOrigin(origin))
  );

  const explicitRedirect =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    process.env.GOOGLE_CALLBACK_URL?.trim();
  if (explicitRedirect) {
    const normalized = normalizeOrigin(explicitRedirect);
    if (normalized && !isLocalOrigin(normalized)) return explicitRedirect;
    if (normalized && isLocalOrigin(normalized) && !firstNonLocalBase) {
      return explicitRedirect;
    }
    if (normalized && isLocalOrigin(normalized)) {
      console.warn(
        "Ignoring local GOOGLE_REDIRECT_URI/GOOGLE_CALLBACK_URL in favor of detected public origin",
        explicitRedirect
      );
    } else {
      console.error("Invalid GOOGLE_REDIRECT_URI", explicitRedirect);
    }
  }

  if (normalizedBase && !isLocalOrigin(normalizedBase)) {
    return new URL("/api/auth/google/callback", normalizedBase).toString();
  }

  try {
    const headersList = await headers();
    const forwardedHost = headersList.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || headersList.get("host")?.trim();
    if (host && !isLocalHost(host)) {
      const forwardedProto = headersList
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim();
      const protocol =
        forwardedProto || (baseUrl.startsWith("https") ? "https" : "http");
      const candidate = `${protocol}://${host}/api/auth/google/callback`;
      const normalized = normalizeOrigin(candidate);
      if (normalized && !isLocalOrigin(normalized)) return candidate;
    }
  } catch (err) {
    console.error("Unable to read request headers for redirect URI", err);
  }

  const safeBase =
    (normalizedBase && !isLocalOrigin(normalizedBase) ? normalizedBase : null) ||
    (requestOrigin && !isLocalOrigin(requestOrigin) ? requestOrigin : null) ||
    (envBase && !isLocalOrigin(envBase) ? envBase : null) ||
    "https://treddit.com";
  return new URL("/api/auth/google/callback", safeBase).toString();
}

export function rememberOrigin(res: NextResponse, origin: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(OAUTH_ORIGIN_COOKIE, origin, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 300,
  });
}

export function clearOauthCookies(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(OAUTH_STATE_COOKIE, "", options);
  res.cookies.set(OAUTH_ORIGIN_COOKIE, "", options);
}

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function consumeRememberedOrigin(
  cookieStore: CookieReader,
): string | null {
  const raw = cookieStore.get(OAUTH_ORIGIN_COOKIE)?.value;
  if (!raw) return null;
  try {
    const normalized = normalizeOrigin(raw);
    return normalized;
  } catch (err) {
    console.error("Invalid oauth_origin cookie", err);
    return null;
  }
}
