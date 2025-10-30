export function getBaseUrl(req: Request) {
  const configuredBase =
    process.env.GOOGLE_OAUTH_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configuredBase) {
    try {
      // normaliza y quita paths extra
      return new URL(configuredBase).origin;
    } catch (err) {
      console.error("Invalid GOOGLE_OAUTH_BASE_URL/NEXT_PUBLIC_BASE_URL", err);
    }
  }

  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim();

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

export function getRedirectUri(baseUrl: string) {
  const explicitRedirect = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicitRedirect) {
    return explicitRedirect;
  }

  return new URL("/api/auth/google/callback", baseUrl).toString();
}
