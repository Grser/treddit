import { headers } from "next/headers";

export async function getRequestBaseUrl() {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.trim();
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host) {
    const protocol = forwardedProto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return "https://treddit.com";
}
