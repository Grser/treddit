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

function normalizeHost(host: string | null | undefined) {
  if (!host) return null;
  const first = host.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;

  // Allow hostnames, IPv4 and optional ports while rejecting malformed header values.
  if (!/^[a-z0-9.-]+(?::\d+)?$/.test(first)) return null;
  return first;
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
  const forwardedHost = normalizeHost(headerList.get("x-forwarded-host"));
  const host = forwardedHost || normalizeHost(headerList.get("host"));
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  if (host) {
    const protocol = forwardedProto === "https" ? "https" : "http";
    return `${protocol}://${host}`;
  }

  return "https://treddit.com";
}
