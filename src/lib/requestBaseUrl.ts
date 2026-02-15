import { headers } from "next/headers";

function isLocalHost(host: string | null | undefined) {
  if (!host) return false;
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function getRequestBaseUrl() {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.trim();
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host && !isLocalHost(host)) {
    const protocol = forwardedProto || "https";
    return `${protocol}://${host}`;
  }

  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return "https://treddit.com";
}
