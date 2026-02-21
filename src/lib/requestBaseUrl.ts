import { headers } from "next/headers";

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function isLocalHost(host: string | null | undefined) {
  if (!host) return false;
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0";
}

export async function getRequestBaseUrl() {
  const configuredBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.AUTH_BASE_URL) ||
    normalizeBaseUrl(process.env.GOOGLE_OAUTH_BASE_URL);

  // Security: never trust forwarded host headers for upstream API requests unless we're in local development.
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.trim();
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  if (host && isLocalHost(host)) {
    const protocol = forwardedProto === "https" ? "https" : "http";
    return `${protocol}://${host}`;
  }

  return "https://treddit.com";
}
